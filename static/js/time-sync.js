/**
 * Time Synchronization Module
 * Syncs client-side time with server NTP time to ensure consistency
 */

const TimeSyncModule = (() => {
    let serverTimeOffset = 0;  // Difference between server time and local time
    let lastSyncTime = null;
    let isInitialized = false;

    async function syncWithServer() {
        try {
            const response = await fetch('/api/time');
            const data = await response.json();
            
            const serverTime = new Date(data.timestamp);
            const clientTime = new Date();
            
            // Calculate offset in milliseconds
            serverTimeOffset = serverTime.getTime() - clientTime.getTime();
            lastSyncTime = new Date();
            
            console.log(`Time synced. Server offset: ${serverTimeOffset}ms`);
            return true;
        } catch (error) {
            console.error('Failed to sync time with server:', error);
            return false;
        }
    }

    function getAccurateTime() {
        /**
         * Returns the current accurate time adjusted for server offset
         */
        return new Date(new Date().getTime() + serverTimeOffset);
    }

    function formatTime(date) {
        /**
         * Formats a date object as HH:MM:SS AM/PM
         */
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${hours}:${minutes}:${seconds} ${month}/${day}`;
    }

    function updateTimeDisplay() {
        /**
         * Updates the server time display on the page
         */
        const timeElement = document.getElementById('server-time');
        if (timeElement) {
            timeElement.textContent = formatTime(getAccurateTime());
        }
    }

    async function initialize() {
        /**
         * Initialize time sync and start periodic updates
         */
        if (isInitialized) return;
        
        // Initial sync
        await syncWithServer();
        isInitialized = true;
        
        // Update display immediately
        updateTimeDisplay();
        
        // Update display every second
        setInterval(updateTimeDisplay, 1000);
        
        // Re-sync with server every 5 minutes
        setInterval(syncWithServer, 5 * 60 * 1000);
    }

    // Public API
    return {
        init: initialize,
        getTime: getAccurateTime,
        getISOTime: () => getAccurateTime().toISOString(),
        formatTime: formatTime,
        syncNow: syncWithServer
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    TimeSyncModule.init();
});
