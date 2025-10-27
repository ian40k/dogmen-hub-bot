async function generateQR() {
    const response = await fetch('/api/qr');
    const data = await response.json();
    
    const qrDiv = document.getElementById('qrCode');
    const statusDiv = document.getElementById('status');
    
    if (data.connected) {
        statusDiv.innerHTML = '✅ WhatsApp Connected! You can now use commands.';
        qrDiv.innerHTML = '';
    } else if (data.qr) {
        statusDiv.innerHTML = '📱 Scan this QR code with WhatsApp → Linked Devices';
        qrDiv.innerHTML = '';
        QRCode.toCanvas(qrDiv, data.qr, { width: 200 }, function(error) {
            if (error) console.error(error);
        });
    } else {
        statusDiv.innerHTML = '❌ Failed to generate QR code. Try again.';
    }
}

// Check status every 3 seconds
setInterval(async () => {
    const response = await fetch('/api/status');
    const data = await response.json();
    
    if (data.connected) {
        document.getElementById('status').innerHTML = '✅ WhatsApp Connected! You can now use commands.';
    }
}, 3000);

// Generate QR on page load
generateQR();
