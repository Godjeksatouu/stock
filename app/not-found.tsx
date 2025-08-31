export default function NotFound() {
  return (
    <html>
      <body>
        <div style={{padding: '2rem', fontFamily: 'system-ui'}}>
          <h1 style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>Page introuvable</h1>
          <p>La page demandée n'existe pas. Veuillez vérifier l'URL.</p>
          <a href="/" style={{color: '#2563EB', textDecoration: 'underline', display: 'inline-block', marginTop: '1rem'}}>
            Retour à l'accueil
          </a>
        </div>
      </body>
    </html>
  )
}

