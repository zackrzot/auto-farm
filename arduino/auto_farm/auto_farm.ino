#include <AM2302-Sensor.h>

constexpr unsigned int SENSOR_PIN {18};
AM2302::AM2302_Sensor am2302{SENSOR_PIN};

// Pin definitions
const int valve_led_pin = 5;
const int valve_relay_pin = 4;
const int fan_pwm_pin = 3;
const int fan_relay_pin = 2;
const int hydrometer_a_in_pin = A0;
const int hydrometer_b_in_pin = A1;

// Sensor readings
double hydrometer_a = 0.0;
double hydrometer_b = 0.0;
double temp_f = 0.0;
double humidity = 0.0;
double fan_signal = 0.0;

// Control state
int print_count = 0;

void setup() {
  Serial.begin(9600);
  pinMode(fan_relay_pin, OUTPUT);
  pinMode(fan_pwm_pin, OUTPUT); 
  pinMode(valve_led_pin, OUTPUT);
  pinMode(valve_relay_pin, OUTPUT); 

  // Valve OFF, Fan OFF
  digitalWrite(valve_led_pin, LOW);
  digitalWrite(valve_relay_pin, LOW);
  digitalWrite(fan_relay_pin, LOW);
  analogWrite(fan_pwm_pin, 0);
}

void loop() {
  // Read hydrometer A
  hydrometer_a = analogRead(hydrometer_a_in_pin);
  hydrometer_a = constrain(hydrometer_a, 400, 1023);
  hydrometer_a = map(hydrometer_a, 400, 1023, 100, 0);

  // Read hydrometer B
  hydrometer_b = analogRead(hydrometer_b_in_pin);
  hydrometer_b = constrain(hydrometer_b, 400, 1023);
  hydrometer_b = map(hydrometer_b, 400, 1023, 100, 0);
  
  // Read temperature and humidity
  auto status = am2302.read();
  double temp_c = am2302.get_Temperature();
  temp_f = (temp_c * 9.0 / 5.0) + 32.0;
  humidity = am2302.get_Humidity();

  // Handle serial commands from Flask
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    // Water valve control
    if (command == "W1") {
      digitalWrite(valve_led_pin, HIGH);
      digitalWrite(valve_relay_pin, HIGH);
    } 
    else if (command == "W0") {
      digitalWrite(valve_led_pin, LOW);
      digitalWrite(valve_relay_pin, LOW);
    } 
    // Fan speed control (0-255)
    else if (command.startsWith("F:")) {
      String speed_str = command.substring(2);
      double fan_speed = speed_str.toDouble();
      fan_speed = constrain(fan_speed, 0, 255);
      fan_signal = fan_speed;

      // Always set PWM
      analogWrite(fan_pwm_pin, (int)fan_speed);

      // Relay logic: relay ON when speed == 0, relay OFF when speed > 0
      // This reverses previous logic: relay ON cuts fan power, relay OFF enables fan
      if ((int)fan_speed == 0) {
        digitalWrite(fan_relay_pin, HIGH); // Relay ON, fan power cut
      } else {
        digitalWrite(fan_relay_pin, LOW); // Relay OFF, fan powered
      }
    }
  }

  // Send sensor data every ~1 second (6 * 200ms = 1.2s)
  if (print_count >= 6) {
    Serial.print(temp_f);
    Serial.print(", ");
    Serial.print(fan_signal);
    Serial.print(", ");
    Serial.print(hydrometer_a);
    Serial.print(", ");
    Serial.print(hydrometer_b);
    Serial.print(", ");
    Serial.println(humidity);
    
    print_count = 0;
  }
  
  print_count++;
  delay(200);
}
