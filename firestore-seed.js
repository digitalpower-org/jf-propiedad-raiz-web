// firestore-seed.js
// Inicializa la colección `authorized_users` con usuarios de prueba autorizados
// Dirección: apunta a emuladores locales para pruebas MT1.2
// Ejecutar: node firestore-seed.js

const admin = require('firebase-admin');

const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const config = {
  projectId: 'jf-propiedad-raiz',
  databaseURL: 'http://localhost:8080?ns=jf-propiedad-raiz',
  storageBucket: 'jf-propiedad-raiz.appspot.com',
};

if (!isEmulator) {
  const serviceAccount = require('./firebase-service-key.json');
  config.credential = admin.credential.cert(serviceAccount);
}

// Inicializa Firebase Admin apuntando a emuladores locales
admin.initializeApp(config);

const db = admin.firestore();

async function seedAuthorizedUsers() {
  console.log('Inicializando colección authorized_users...');

  const testUsers = [
    {
      email: 'dpa70.dev@gmail.com',
      role: 'admin',
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      email: 'santiago.santifer@gmail.com',
      role: 'admin',
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      email: 'emilio.ortiz234@gmail.com',
      role: 'admin',
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      email: 'michellecorrea.all@gmail.com',
      role: 'admin',
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {
      email: 'aylynandres2019@gmail.com',
      role: 'admin',
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  ];

  // Borrar documentos existentes (para idempotencia)
  console.log('Limpiando colección authorized_users...');
  const existingDocs = await db.collection('authorized_users').get();
  const deletePromises = existingDocs.docs.map((doc) => doc.ref.delete());
  await Promise.all(deletePromises);

  // Escribir nuevos documentos
  console.log(`Creando ${testUsers.length} usuarios autorizados...`);
  const writePromises = testUsers.map((user) => db.collection('authorized_users').add(user));
  await Promise.all(writePromises);

  // Verificar que los documentos se crearon
  const snapshot = await db.collection('authorized_users').get();
  console.log(`✅ Éxito: ${snapshot.size} usuarios autorizados creados.`);
  console.log('\nUsuarios creados:');
  snapshot.docs.forEach((doc) => {
    console.log(`  - ${doc.data().email} (role: ${doc.data().role}, active: ${doc.data().active})`);
  });

  // Limpiar la conexión
  await admin.firestore().terminate();
  console.log('\n🔌 Firestore Admin finalizado.');
}

// Manejar errores
seedAuthorizedUsers()
  .then(() => {
    console.log('\n✅ Seed completado con éxito');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error durante el seed:', error);
    process.exit(1);
  });
