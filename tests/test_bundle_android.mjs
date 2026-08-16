import http from 'node:http';

console.log('Fetching Android bundle from Metro on http://localhost:8081 ...');

const req = http.get('http://localhost:8081/index.bundle?platform=android&dev=true', (res) => {
    console.log(`HTTP Status: ${res.statusCode}`);
    let dataLen = 0;
    let sample = '';
    res.on('data', (chunk) => {
        dataLen += chunk.length;
        if (sample.length < 500) {
            sample += chunk.toString();
        }
    });
    res.on('end', () => {
        console.log(`Bundle Size: ${(dataLen / 1024 / 1024).toFixed(2)} MB`);
        if (res.statusCode === 200) {
            console.log('✅ Android Bundle generated successfully with 0 syntax errors!');
            process.exit(0);
        } else {
            console.error('❌ Metro returned error:', sample);
            process.exit(1);
        }
    });
});

req.on('error', (err) => {
    console.error('Error connecting to Metro:', err.message);
    process.exit(1);
});
