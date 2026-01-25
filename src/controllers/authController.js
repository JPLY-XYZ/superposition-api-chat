import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma.js';
import { generateUserCode } from '../helpers/user.js';


//in {email, password, publicKey}, out { message, userId, code }

const register = async (req, res) => {
  const { email, password, publicKey } = req.body;
  try {

    //se hashea la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    //se crea el usuario
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, publicKey, displayName: "NO-NAMED", code: "0000-AAAA-A" }
    });

    //se genera el codigo de usuario usado para añadir contactos
    const code = generateUserCode(user.id);

    //se actualiza el usuario con el codigo
    await prisma.user.update({
      where: { id: user.id },
      data: { code }
    });

    //se envia la respuesta al cliente
    res.status(201).json({ message: "Usuario creado", userId: user.id, code: code });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: "El email ya está registrado" + error });
  }
};

//in {email, password}, out { token, userId }
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && await bcrypt.compare(password, user.password)) {
      //Creamos un nuevo token
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      //Se envia el token al cliente
      res.json({ token, userId: user.id });
    } else {
      //Se envia un error al cliente
      res.status(400).json({ error: "Credenciales inválidas" });
    }
  } catch (error) {
    //Se envia un error al cliente
    console.log(error);
    res.status(401).json({ error: "Error al iniciar sesión" });
  }

};

export { register, login };