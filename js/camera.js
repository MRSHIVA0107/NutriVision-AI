/**
 * NutriVision AI - Camera Module (js/camera.js)
 * Manages live video stream, photo snapshot, camera switching, and device permissions.
 */

class NutriCamera {
  constructor() {
    this.stream = null;
    this.currentFacingMode = 'environment'; // Default to rear camera on mobile
    this.devices = [];
    this.isStreaming = false;
  }

  /**
   * Checks if userMedia is supported in the current browser/context.
   */
  isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Starts camera feed into provided HTML video element.
   */
  async startCamera(videoElement) {
    if (!this.isSupported()) {
      throw new Error('Camera access is not supported by your browser or current security context. (HTTPS is required).');
    }

    // Stop existing stream if running
    this.stopCamera();

    const constraints = {
      video: {
        facingMode: { ideal: this.currentFacingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = this.stream;
      await videoElement.play();
      this.isStreaming = true;

      // Enumerate available devices for camera flip button
      await this.enumerateDevices();

      return true;
    } catch (err) {
      this.isStreaming = false;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Camera access was denied. Please allow camera permissions in your browser address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('No camera hardware was detected on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        throw new Error('Camera is currently in use by another application.');
      } else {
        throw new Error(`Failed to access camera: ${err.message || err.name}`);
      }
    }
  }

  /**
   * Captures the current video frame and returns a File/Blob object.
   */
  capturePhoto(videoElement, canvasElement) {
    if (!this.isStreaming || !videoElement) {
      throw new Error('Camera is not active.');
    }

    const videoWidth = videoElement.videoWidth || 640;
    const videoHeight = videoElement.videoHeight || 480;

    canvasElement.width = videoWidth;
    canvasElement.height = videoHeight;

    const ctx = canvasElement.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, videoWidth, videoHeight);

    return new Promise((resolve, reject) => {
      canvasElement.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to capture image snapshot from camera canvas.'));
            return;
          }
          const fileName = `nutrivision-camera-${Date.now()}.jpg`;
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          const dataUrl = canvasElement.toDataURL('image/jpeg', 0.92);

          resolve({ blob, file, dataUrl });
        },
        'image/jpeg',
        0.92
      );
    });
  }

  /**
   * Switches between environment (rear) and user (front) facing camera.
   */
  async switchCamera(videoElement) {
    this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    return await this.startCamera(videoElement);
  }

  /**
   * Stops live camera stream and releases hardware tracks.
   */
  stopCamera(videoElement = null) {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.isStreaming = false;

    if (videoElement) {
      videoElement.srcObject = null;
    }
  }

  async enumerateDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.devices = devices.filter((d) => d.kind === 'videoinput');
      return this.devices;
    } catch {
      return [];
    }
  }
}

// Export singleton instance
window.nutriCamera = new NutriCamera();
