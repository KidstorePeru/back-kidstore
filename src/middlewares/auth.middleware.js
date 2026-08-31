export const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey === process.env.INTERNAL_API_KEY) {
        next();
    } else {
        res.status(401).json({ error: 'No autorizado. Se requiere API Key válida.' });
    }
};