import jwt from 'jsonwebtoken';

const authenticateToken = (req, res, next) => {
  // Obtenemos el token del header 'Authorization'
  const authHeader = req.headers['authorization'];

  const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado: Token no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Guardamos el id del usuario en la request
    next(); // Continuamos al controlador
  } catch (err) {
    return res.status(403).json({ error: "Token inválido o expirado" });
  }
};

export { authenticateToken };