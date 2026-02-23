document.addEventListener('DOMContentLoaded', function() {
    function updateTriggers() {
        fetch('/api/triggers')
            .then(function(response) {
                return response.json();
            })
            .then(function(triggers) {
                var container = document.getElementById('triggers-list');
                if (!container) return;
                container.innerHTML = '';
                triggers.forEach(function(trigger) {
                    var activeClass = trigger.active ? 'active' : 'inactive';
                    var statusText = trigger.active ? '✓ Active' : '○ Inactive';
                    var statusClass = trigger.active ? 'active' : 'inactive';
                    var html = '<div class="col-lg-4 col-md-6">' +
                               '<div class="card trigger-card ' + activeClass + ' h-100 d-flex flex-column">' +
                               '<div class="card-body d-flex flex-column">' +
                               '<h6 class="trigger-title">' + trigger.name + '</h6>' +
                               '<p class="trigger-description">' + trigger.description + '</p>' +
                               '<p class="trigger-details"><small>' + trigger.details + '</small></p>' +
                               '<div class="mt-auto">' +
                               '<span class="trigger-status ' + statusClass + '">' + statusText + '</span>' +
                               '</div>' +
                               '</div>' +
                               '</div>' +
                               '</div>';
                    container.innerHTML += html;
                });
            });
    }
    setInterval(updateTriggers, 1000);
    updateTriggers();
});
