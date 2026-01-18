# Usa una imagen ligera de Node
FROM node:18-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de dependencias
COPY package*.json ./

# Instala dependencias
RUN npm install --production

# Copia el resto del código
COPY . .

# Expone el puerto (ajústalo si tu app usa otro)
EXPOSE 3000

# Comando para iniciar
CMD ["npm", "start"]