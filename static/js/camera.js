// Camera functionality for auto-farm
document.addEventListener('DOMContentLoaded', function() {
    const cameraImage = document.getElementById('cameraImage');
    const noCamera = document.getElementById('noCamera');
    const captureBtn = document.getElementById('captureBtn');
    const captureSpinner = document.getElementById('captureSpinner');
    const autoRefreshBtn = document.getElementById('autoRefreshBtn');
    const gallerySlider = document.getElementById('gallerySlider');
    const emptyGallery = document.getElementById('emptyGallery');
    const galleryContent = document.getElementById('galleryContent');
    const galleryCount = document.getElementById('galleryCount');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const loadingSpinner = document.querySelector('.loading-spinner');
    const gallerySelected = document.getElementById('gallerySelected');
    const selectedFilename = document.getElementById('selectedFilename');
    const selectedTimestamp = document.getElementById('selectedTimestamp');
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalClose = document.getElementById('modalClose');
    const modalPrev = document.getElementById('modalPrev');
    const modalNext = document.getElementById('modalNext');

    let allImages = [];
    let currentImageIndex = -1;
    let autoRefreshInterval = null;

    // Load sensor data
    function loadSensorData() {
        fetch('/api/data')
            .then(response => response.json())
            .then(data => {
                document.getElementById('statTemp').innerHTML = data.temp_f ? data.temp_f.toFixed(1) + '&deg;F' : '--';
                document.getElementById('statHumidity').textContent = data.humidity ? data.humidity.toFixed(1) + '%' : '--';
                document.getElementById('statSoilA').textContent = data.hydrometer_a ? data.hydrometer_a.toFixed(1) + '%' : '--';
                document.getElementById('statSoilB').textContent = data.hydrometer_b ? data.hydrometer_b.toFixed(1) + '%' : '--';
                document.getElementById('statFan').textContent = data.fan_signal ? data.fan_signal.toFixed(0) : '--';
            })
            .catch(err => console.error('Error loading sensor data:', err));
    }

    // Capture image from webcam
    function captureImage() {
        captureBtn.disabled = true;
        captureSpinner.style.display = 'inline-block';
        loadingSpinner.style.display = 'block';

        fetch('/api/camera/capture', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showError(data.error);
                    noCamera.style.display = 'block';
                    cameraImage.style.display = 'none';
                } else {
                    // Display the captured image
                    displayLatestImage();
                    // Reload gallery
                    loadGallery();
                }
            })
            .catch(err => {
                console.error('Error capturing image:', err);
                showError('Failed to capture image');
            })
            .finally(() => {
                captureBtn.disabled = false;
                captureSpinner.style.display = 'none';
                loadingSpinner.style.display = 'none';
            });
    }

    // Display the latest captured image
    function displayLatestImage() {
        fetch('/api/camera/latest')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    noCamera.style.display = 'block';
                    cameraImage.style.display = 'none';
                } else {
                    const imageUrl = `/camera/images/${data.filename}?t=${Date.now()}`;
                    cameraImage.src = imageUrl;
                    cameraImage.style.display = 'block';
                    noCamera.style.display = 'none';
                    loadSensorData();
                }
            })
            .catch(err => {
                console.error('Error loading latest image:', err);
                noCamera.style.display = 'block';
                cameraImage.style.display = 'none';
            });
    }

    // Gallery paging state
    let galleryOffset = 0;
    const GALLERY_LIMIT = 10;
    let galleryTotal = 0;

    function loadGallery(initial = false) {
        fetch(`/api/camera/images?limit=${GALLERY_LIMIT}&offset=${galleryOffset}`)
            .then(response => response.json())
            .then(data => {
                if (initial) {
                    allImages = [];
                    gallerySlider.innerHTML = '';
                }
                const images = data.images || [];
                galleryTotal = data.total || 0;
                if (initial && images.length === 0) {
                    emptyGallery.style.display = 'block';
                    galleryContent.style.display = 'none';
                    galleryCount.textContent = '';
                } else {
                    emptyGallery.style.display = 'none';
                    galleryContent.style.display = 'block';
                    galleryCount.textContent = `(${galleryTotal} images)`;
                    // Add gallery items
                    images.forEach((image, index) => {
                        const globalIndex = galleryOffset + index;
                        allImages[globalIndex] = image;
                        const item = document.createElement('div');
                        item.className = 'gallery-item';
                        item.style.cursor = 'pointer';
                        item.dataset.index = globalIndex;
                        const img = document.createElement('img');
                        img.src = `/camera/images/${image.filename}`;
                        img.alt = `Captured ${image.timestamp}`;
                        item.appendChild(img);
                        item.addEventListener('click', () => {
                            selectImage(globalIndex);
                            openImageModal(image.filename);
                        });
                        gallerySlider.appendChild(item);
                    });
                    updateGalleryNavigation();
                    if (initial && images.length > 0) {
                        selectImage(0);
                    }
                }
            })
            .catch(err => {
                console.error('Error loading gallery:', err);
                emptyGallery.style.display = 'block';
                galleryContent.style.display = 'none';
            });
    }

    // Load more images when scrolling to end
    gallerySlider.addEventListener('scroll', function() {
        if (gallerySlider.scrollLeft + gallerySlider.clientWidth >= gallerySlider.scrollWidth - 10) {
            // If not all images loaded, load next batch
            if (allImages.length < galleryTotal) {
                galleryOffset = allImages.length;
                loadGallery(false);
            }
        }
    });

    // Select an image from the gallery
    function selectImage(index) {
        currentImageIndex = index;

        // Update active state
        document.querySelectorAll('.gallery-item').forEach((item, i) => {
            if (i === index) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Display selected image info
        if (allImages[index]) {
            const image = allImages[index];
            selectedFilename.textContent = image.filename;
            selectedTimestamp.innerHTML = `<br><small>${new Date(image.timestamp).toLocaleString()}</small>`;
            gallerySelected.style.display = 'block';

            // Scroll into view
            const items = document.querySelectorAll('.gallery-item');
            if (items[index]) {
                items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }

    // Open modal with enlarged image
    function openImageModal(filename) {
        // Find index by filename
        const idx = allImages.findIndex(img => img.filename === filename);
        if (idx !== -1) {
            currentImageIndex = idx;
        }
        updateModalImage();
        imageModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function updateModalImage() {
        if (allImages[currentImageIndex]) {
            modalImage.src = `/camera/images/${allImages[currentImageIndex].filename}`;
        }
        // Enable/disable arrows
        modalPrev.disabled = (currentImageIndex <= 0);
        modalNext.disabled = (currentImageIndex >= allImages.length - 1);
    }
    // Modal arrow navigation
    modalPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentImageIndex > 0) {
            currentImageIndex--;
            updateModalImage();
        }
    });
    modalNext.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentImageIndex < allImages.length - 1) {
            currentImageIndex++;
            updateModalImage();
        }
    });

    // Keyboard arrow navigation
    document.addEventListener('keydown', (event) => {
        if (imageModal.classList.contains('active')) {
            if (event.key === 'ArrowLeft') {
                if (currentImageIndex > 0) {
                    currentImageIndex--;
                    updateModalImage();
                }
            } else if (event.key === 'ArrowRight') {
                if (currentImageIndex < allImages.length - 1) {
                    currentImageIndex++;
                    updateModalImage();
                }
            }
        }
    });

    // Close modal
    function closeImageModal() {
        imageModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    // Update gallery navigation buttons
    function updateGalleryNavigation() {
        if (allImages.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'block';
            nextBtn.style.display = 'block';
        }
    }

    // Gallery navigation
    prevBtn.addEventListener('click', () => {
        const slider = document.getElementById('gallerySlider');
        slider.scrollBy({ left: -200, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
        const slider = document.getElementById('gallerySlider');
        slider.scrollBy({ left: 200, behavior: 'smooth' });
    });

    // Auto-refresh toggle
    autoRefreshBtn.addEventListener('click', () => {
        const isEnabled = autoRefreshBtn.dataset.autoRefresh === 'true';

        if (isEnabled) {
            // Disable auto-refresh
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
            }
            autoRefreshBtn.classList.remove('btn-secondary');
            autoRefreshBtn.classList.add('btn-outline-secondary');
            autoRefreshBtn.textContent = 'Enable Auto-Refresh';
            autoRefreshBtn.dataset.autoRefresh = 'false';
        } else {
            // Enable auto-refresh
            autoRefreshBtn.classList.remove('btn-outline-secondary');
            autoRefreshBtn.classList.add('btn-secondary');
            autoRefreshBtn.textContent = 'Disable Auto-Refresh';
            autoRefreshBtn.dataset.autoRefresh = 'true';

            // Capture every 30 seconds
            autoRefreshInterval = setInterval(() => {
                captureImage();
            }, 30000);

            // Initial capture
            captureImage();
        }
    });

    // Show error message
    function showError(message) {
        console.error(message);
        // Could add a toast notification here
    }

    // Capture button click
    captureBtn.addEventListener('click', captureImage);

    // Modal event listeners
    modalClose.addEventListener('click', closeImageModal);
    imageModal.addEventListener('click', (event) => {
        // Close modal if clicked outside the image content
        if (event.target === imageModal) {
            closeImageModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && imageModal.classList.contains('active')) {
            closeImageModal();
        }
    });

    // Initialize on page load
    displayLatestImage();
    loadGallery(true);
    loadSensorData();

    // Update sensor data every 2 seconds
    setInterval(loadSensorData, 2000);
});
