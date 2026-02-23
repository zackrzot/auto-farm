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
                    var statusClass = trigger.active ? 'text-success' : 'text-muted';
                    var statusText = trigger.active ? 'Active' : 'Inactive';
                    var html = '<div class="mb-3 p-3 border rounded"><h6>' + trigger.name + '</h6><p>' + trigger.description + '</p><p><strong>Status:</strong> <span class="' + statusClass + '">' + statusText + '</span></p><p><small>' + trigger.details + '</small></p></div>';
                    container.innerHTML += html;
                });
            });
    }
    setInterval(updateTriggers, 1000);
    updateTriggers();
});
