import prisma from "../../lib/prisma.js";


//in {}, out { code }
export const getMyContactCode = async (req, res) => {
  try {
    //buscamos el codigo del usuario
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { code: true }
    });
    //retornamos el codigo
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener perfil" });
  }
};

//in {code OR id}, out { user } == { id, displayName, imageUrl, publicKey, code }
export const getUser = async (req, res) => {
  const { code, id } = req.body;


  try {
    //buscamos el usuario por codigo
    if (code) {
      const user = await prisma.user.findUnique({
        where: { code },
        select: { id: true, displayName: true, imageUrl: true, publicKey: true, code: true }
      });
    } else if (id) {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, displayName: true, imageUrl: true, publicKey: true, code: true }
      });
    }

    //si no existe el usuario
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    //retornamos el usuario
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Error al validar el codigo de contacto" });
  }
};


//in {}, out { user } == { id, displayName, imageUrl, publicKey, code }
export const getMe = async (req, res) => {
  try {
    //buscamos el usuario
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, displayName: true, imageUrl: true, publicKey: true, code: true }
    });
    //retornamos el usuario
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener perfil" });
  }
};

//in {displayName, imageUrl, publicKey}, out { user } == { id, displayName, imageUrl, publicKey, code }
export const updateMe = async (req, res) => {
  const { displayName, imageUrl, publicKey } = req.body;

  try {
    //actualizamos el usuario
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { displayName, imageUrl, publicKey }
    });
    //retornamos el usuario
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar el usuario" });
  }
};