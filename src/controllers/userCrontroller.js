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
  try {
    const { code, id } = req.body;

    // VALIDACIÓN BÁSICA
    if (!code && !id) {
      return res.status(400).json({ message: "Se requiere ID o Code" });
    }

    let user = null;

    // 1. Si hay ID, buscamos por ID
    if (id) {
      user = await prisma.user.findUnique({
        where: { id: id }
      });
    }
    // 2. Si NO hay ID pero hay Code, buscamos por Code
    else if (code) {
      user = await prisma.user.findUnique({
        where: { code: code }
      });
    }

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(user);

  } catch (error) {
    console.error("Error getUser:", error);
    res.status(500).json({ error: error.message });
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


export const upsertPushToken = async (req, res) => {
  const { pushToken } = req.body;

  try {
    await prisma.user.update({ // Usamos update, no upsert
      where: { id: req.user.id },
      data: { pushToken: pushToken } // update sí usa 'data'
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar el push token" });
  }
};