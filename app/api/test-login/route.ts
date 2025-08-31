import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database';

export async function GET() {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Login - Stock Management</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
            box-sizing: border-box;
        }
        button {
            width: 100%;
            padding: 12px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            margin: 10px 0;
        }
        button:hover {
            background: #0056b3;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            white-space: pre-wrap;
        }
        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Test de Connexion</h1>
        
        <div class="result info">
            <strong>Status:</strong> Page accessible via API route ✅<br>
            <strong>URL:</strong> <span id="current-url"></span><br>
            <strong>Heure:</strong> <span id="current-time"></span>
        </div>
        
        <div class="form-group">
            <label>Email:</label>
            <input type="email" id="email" placeholder="votre@email.com" autocomplete="off">
        </div>

        <div class="form-group">
            <label>Mot de passe:</label>
            <input type="password" id="password" placeholder="••••••••" autocomplete="new-password">
        </div>
        
        <button onclick="testLogin()">🔐 Tester la Connexion</button>
        <button onclick="testAPI()">🔍 Tester l'API</button>
        <button onclick="testBoth()">🚀 Tester les Deux Endpoints</button>
        
        <div id="results"></div>
    </div>

    <script>
        // Update page info
        document.getElementById('current-url').textContent = window.location.origin;
        document.getElementById('current-time').textContent = new Date().toLocaleString();

        async function testLogin() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const resultsDiv = document.getElementById('results');
            
            try {
                console.log('🔐 Testing login with:', { email });
                
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                console.log('📡 Response status:', response.status);
                
                const data = await response.json();
                console.log('📋 Response data:', data);
                
                const resultText = \`Test de Connexion (/api/auth/login):
Status: \${response.status}
Success: \${data.success}
\${data.success ? 
    \`✅ SUCCÈS!
Utilisateur: \${data.data.username}
Rôle: \${data.data.role}
Email: \${data.data.email}
Stock ID: \${data.data.stockId || 'Tous'}\` : 
    \`❌ ÉCHEC!
Erreur: \${data.error}\`}
Heure: \${new Date().toLocaleTimeString()}\`;
                
                const resultClass = data.success ? 'success' : 'error';
                resultsDiv.innerHTML = \`<div class="result \${resultClass}">\${resultText}</div>\` + resultsDiv.innerHTML;
                
            } catch (error) {
                console.error('🚨 Login error:', error);
                resultsDiv.innerHTML = \`<div class="result error">ERREUR DE CONNEXION:
Erreur: \${error.message}
Type: \${error.name}
Heure: \${new Date().toLocaleTimeString()}

Cela signifie que le frontend ne peut pas atteindre le backend.
Vérifiez les logs PM2: pm2 logs stock-management</div>\` + resultsDiv.innerHTML;
            }
        }

        async function testAPI() {
            const resultsDiv = document.getElementById('results');
            
            try {
                const response = await fetch('/api/auth/login');
                const data = await response.json();
                
                resultsDiv.innerHTML = \`<div class="result success">Test API (/api/auth/login GET):
Status: \${response.status}
Message: \${data.message}
Heure: \${new Date().toLocaleTimeString()}

✅ L'API répond correctement!</div>\` + resultsDiv.innerHTML;
                
            } catch (error) {
                resultsDiv.innerHTML = \`<div class="result error">Test API ÉCHEC:
Erreur: \${error.message}
Heure: \${new Date().toLocaleTimeString()}</div>\` + resultsDiv.innerHTML;
            }
        }

        async function testBoth() {
            const resultsDiv = document.getElementById('results');
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            resultsDiv.innerHTML = '<div class="result info">🔄 Test des deux endpoints...</div>' + resultsDiv.innerHTML;
            
            // Test /api/auth/login
            try {
                const apiResponse = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const apiData = await apiResponse.json();
                
                const apiResult = \`API Endpoint (/api/auth/login):
Status: \${apiResponse.status}
Success: \${apiData.success}
\${apiData.success ? \`✅ Utilisateur: \${apiData.data.username} (\${apiData.data.role})\` : \`❌ Erreur: \${apiData.error}\`}\`;
                
                const apiClass = apiData.success ? 'success' : 'error';
                resultsDiv.innerHTML = \`<div class="result \${apiClass}">\${apiResult}</div>\` + resultsDiv.innerHTML;
                
            } catch (error) {
                resultsDiv.innerHTML = \`<div class="result error">❌ /api/auth/login ERREUR: \${error.message}</div>\` + resultsDiv.innerHTML;
            }
            
            // Small delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Test /auth/login
            try {
                const authResponse = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const authData = await authResponse.json();
                
                const authResult = \`Frontend Endpoint (/auth/login):
Status: \${authResponse.status}
Success: \${authData.success}
\${authData.success ? \`✅ Utilisateur: \${authData.data.username} (\${authData.data.role})\` : \`❌ Erreur: \${authData.error}\`}\`;
                
                const authClass = authData.success ? 'success' : 'error';
                resultsDiv.innerHTML = \`<div class="result \${authClass}">\${authResult}</div>\` + resultsDiv.innerHTML;
                
            } catch (error) {
                resultsDiv.innerHTML = \`<div class="result error">❌ /auth/login ERREUR: \${error.message}</div>\` + resultsDiv.innerHTML;
            }
        }
    </script>
</body>
</html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email et mot de passe requis' 
      }, { status: 400 });
    }

    const query = 'SELECT * FROM users WHERE email = ? AND is_active = 1';
    const [users] = await pool.execute(query, [email]);

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non trouvé' 
      }, { status: 401 });
    }

    const user = users[0] as any;

    if (password !== user.password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Mot de passe incorrect' 
      }, { status: 401 });
    }

    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      stockId: user.stock_id
    };

    return NextResponse.json({
      success: true,
      data: userData,
      message: 'Connexion réussie via test API'
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur serveur: ' + (error instanceof Error ? error.message : 'Erreur inconnue')
    }, { status: 500 });
  }
}
