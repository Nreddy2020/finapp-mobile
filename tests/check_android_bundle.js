const http = require('http');

const req = http.get('http://localhost:8081/index.bundle?platform=android&dev=true&minify=false', (res) => {
    let data = '';
    console.log('Status code:', res.statusCode);
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        if (res.statusCode !== 200) {
            console.error('Android Bundle Error:', data);
        } else {
            console.log('Android Bundle successfully compiled! Length:', data.length);
        }
    });
});

req.on('error', err => {
    console.error('Request error:', err);
});
