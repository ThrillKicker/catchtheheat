const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Add cache control headers to prevent redirect loops
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

app.use(express.static('./'));

app.listen(port, () => {
    console.log(`Game running at http://localhost:${port}`);
}); 