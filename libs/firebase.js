import Firebase from 'firebase'
import config from '../config'

if (!Firebase.apps.length) {
  Firebase.initializeApp({
    credential: Firebase.credential.cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey
    }),
    databaseURL: config.firebase.databaseUrl
  })
}

export default Firebase
