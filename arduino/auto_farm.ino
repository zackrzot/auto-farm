#include <AM2302-Sensor.h>

constexpr unsigned int SENSOR_PIN {18};

AM2302::AM2302_Sensor am2302{SENSOR_PIN};

const int valve_led_pin = 5;
const int valve_relay_pin = 4;
const int fan_pwm_pin = 3;
const int fan_relay_pin = 2;
const int hydrometer_a_in_pin = A0;
const int hydrometer_b_in_pin = A1;

double hydrometer_a = 0.0;
double hydrometer_b = 0.0;

double temp_c = 0;
double temp_f = 0;
double humidity = 0;

double hydrometer_error = 1.0;
double valve_on = 75.0;
double valve_off = 99.0;

double min_water_temp = 70.0;
double target_humid = 75.0;
double over_humid = 0.0;
double target_temp_f = 80.0;
double target_overtemp_f = 0.0;
double overtemp_f = 0.0;
double input, output;
double fan_control_signal = 0.0;
double fan_control_signal_min = 0.0;
double fan_control_signal_max = 255.0;
double fan_relay_cutoff = 1.0;

bool manual_water = false;
bool manual_fan = false;
double manual_fan_speed = 0.0;

int print_count = 0;

void setup() {
  Serial.begin(9600);
  pinMode(fan_relay_pin, OUTPUT);
  pinMode(fan_pwm_pin, OUTPUT); 
  pinMode(valve_led_pin, OUTPUT);
  pinMode(valve_relay_pin, OUTPUT); 

  // Valve OFF
  digitalWrite(valve_led_pin, LOW); 
  digitalWrite(valve_relay_pin, LOW); 
}

void loop() {
  // Get hydrometer A
  hydrometer_a = analogRead(hydrometer_a_in_pin);
  hydrometer_a = constrain(hydrometer_a, 400, 1023);
  hydrometer_a = map(hydrometer_a, 400, 1023, 100, 0);

  // Get hydrometer B
  hydrometer_b = analogRead(hydrometer_b_in_pin);
  hydrometer_b = constrain(hydrometer_b, 400, 1023);
  hydrometer_b = map(hydrometer_b, 400, 1023, 100, 0);
  
  auto status = am2302.read();
  // Get temp
  temp_c = am2302.get_Temperature();
  temp_f = (temp_c * 9/5) + 32;

  // Get humidity
  humidity = am2302.get_Humidity();

  // Handle serial commands
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    if (command == "W1") {
      manual_water = true;
      digitalWrite(valve_led_pin, HIGH); 
      digitalWrite(valve_relay_pin, HIGH);
    } else if (command == "W0") {
      manual_water = false;
      digitalWrite(valve_led_pin, LOW); 
      digitalWrite(valve_relay_pin, LOW);
    } else if (command.startsWith("F:")) {
      manual_fan = true;
      manual_fan_speed = command.substring(2).toDouble();
      manual_fan_speed = constrain(manual_fan_speed, 0, 255);
      analogWrite(fan_pwm_pin, manual_fan_speed);
      if (manual_fan_speed <= fan_relay_cutoff) {
        digitalWrite(fan_relay_pin, HIGH); 
      } else {
        digitalWrite(fan_relay_pin, LOW); 
      }
    } else if (command == "A") {
      manual_fan = false;
      manual_water = false;
    }
  }

  // Determine overtemp
  overtemp_f = temp_f - target_temp_f;
  if(overtemp_f < 0){
    overtemp_f = 0;
  }

  // Determine over humid
  over_humid = humidity - target_humid;
  if(over_humid < 0){
    over_humid = 0;
  }

  // Set fan
  set_fan();
  set_valve();

  if(print_count >= 6){
    // Log
	// TMP_F:
    Serial.print("");
    Serial.print(temp_f);
	// F_CTRL_SIG
    Serial.print(", ");
    Serial.print(fan_control_signal);
	// SHA
    Serial.print(", ");
    Serial.print(hydrometer_a);
	// SHB
    Serial.print(", ");
    Serial.print(hydrometer_b);
	// AH
    Serial.print(", ");
    Serial.println(humidity);
    print_count = 0;
  }
  print_count = print_count + 1;

  delay(200);
}


void set_fan(){
  if (manual_fan) {
    return; // Manual control active
  }
  double fan_pct = overtemp_f / 5;
  if(fan_pct>1.0){
    fan_pct = 1.0;
  }
  fan_control_signal = fan_pct * 255;

  fan_pct = over_humid / 15;
  if(fan_pct>1.0){
    fan_pct = 1.0;
  }
  double fan_control_signal_2 = fan_pct * 255;

  if(fan_control_signal_2 > fan_control_signal){
    fan_control_signal = fan_control_signal_2;
  }

  analogWrite(fan_pwm_pin, fan_control_signal);
  if(fan_control_signal <= fan_relay_cutoff){
    digitalWrite(fan_relay_pin, HIGH); 
  }
  else{
    digitalWrite(fan_relay_pin, LOW); 
  }
}


void set_valve(){
  if (manual_water) {
    return; // Manual control active
  }

  if(hydrometer_a < hydrometer_error){
    Serial.println("HYDROMETER A ERROR");
    digitalWrite(valve_led_pin, LOW); 
    digitalWrite(valve_relay_pin, LOW); 
    return;
  }

  if(hydrometer_b < hydrometer_error){
    Serial.println("HYDROMETER B ERROR");
    digitalWrite(valve_led_pin, LOW); 
    digitalWrite(valve_relay_pin, LOW); 
    return;
  }

  if(hydrometer_a <= valve_on || hydrometer_b <= valve_on){
    if(temp_f >= min_water_temp){
      digitalWrite(valve_led_pin, HIGH); 
      digitalWrite(valve_relay_pin, HIGH);
    }
  }

  if(hydrometer_a >= valve_off && hydrometer_b >= valve_off){
    digitalWrite(valve_led_pin, LOW); 
    digitalWrite(valve_relay_pin, LOW); 
  }

}
