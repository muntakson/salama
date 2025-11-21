from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime
from werkzeug.utils import secure_filename
import json
import secrets
import hashlib
import requests

app = Flask(__name__)
CORS(app)

# Configure Flask to not escape non-ASCII characters in JSON
app.config['JSON_AS_ASCII'] = False

# Admin session storage (in-memory for simplicity)
# In production, use Redis or database
ADMIN_SESSIONS = set()

# Configuration
DATABASE = 'medical_training.db'
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mp3', 'wav', 'm4a', 'pdf'}
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# Database initialization
def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # Categories table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            name_swahili TEXT,
            name_korean TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Training cards table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS training_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            title_swahili TEXT,
            title_korean TEXT,
            category_id INTEGER,
            content_provider TEXT,
            target_audience TEXT,
            difficulty_level TEXT,
            markdown_text TEXT,
            html_content TEXT,
            image_url TEXT,
            video_url TEXT,
            audio_url TEXT,
            view_count INTEGER DEFAULT 0,
            like_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        )
    ''')

    # Comments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            comment_text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (card_id) REFERENCES training_cards(id) ON DELETE CASCADE
        )
    ''')

    # Likes tracking table (to prevent multiple likes)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS card_likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL,
            user_identifier TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(card_id, user_identifier),
            FOREIGN KEY (card_id) REFERENCES training_cards(id) ON DELETE CASCADE
        )
    ''')

    # Insert default categories
    default_categories = [
        ('All', 'Yote', '모두', 'All medical devices'),
        ('Suction Pumps', 'Pampu za Kunyonya', '석션 펌프', 'Suction pump devices'),
        ('Lighting', 'Taa', '조명', 'Medical lighting equipment'),
        ('Surgery Equipment', 'Vifaa vya Upasuaji', '수술 장비', 'Surgical equipment and tools'),
        ('Diagnostic Equipment', 'Vifaa vya Uchunguzi', '진단 장비', 'Diagnostic devices'),
        ('Patient Monitoring', 'Ufuatiliaji wa Wagonjwa', '환자 모니터링', 'Patient monitoring systems'),
        ('Sterilization', 'Usafi', '멸균', 'Sterilization equipment'),
        ('Laboratory Equipment', 'Vifaa vya Maabara', '실험실 장비', 'Laboratory devices')
    ]

    for cat in default_categories:
        cursor.execute('''
            INSERT OR IGNORE INTO categories (name, name_swahili, name_korean, description)
            VALUES (?, ?, ?, ?)
        ''', cat)

    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# API Routes

@app.route('/api/categories', methods=['GET'])
def get_categories():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM categories ORDER BY name')
    categories = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(categories)

@app.route('/api/categories', methods=['POST'])
def create_category():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO categories (name, name_swahili, name_korean, description)
            VALUES (?, ?, ?, ?)
        ''', (data['name'], data.get('name_swahili'), data.get('name_korean'), data.get('description')))
        conn.commit()
        category_id = cursor.lastrowid
        conn.close()
        return jsonify({'id': category_id, 'message': 'Category created successfully'}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Category already exists'}), 400

@app.route('/api/categories/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE categories
        SET name=?, name_swahili=?, name_korean=?, description=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
    ''', (data['name'], data.get('name_swahili'), data.get('name_korean'), data.get('description'), category_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Category updated successfully'})

@app.route('/api/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM categories WHERE id=?', (category_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Category deleted successfully'})

@app.route('/api/cards', methods=['GET'])
def get_cards():
    category_id = request.args.get('category_id')
    search = request.args.get('search', '')

    conn = get_db()
    cursor = conn.cursor()

    query = '''
        SELECT tc.*, c.name as category_name, c.name_swahili as category_name_swahili,
               c.name_korean as category_name_korean,
               (SELECT COUNT(*) FROM comments WHERE card_id = tc.id) as comment_count
        FROM training_cards tc
        LEFT JOIN categories c ON tc.category_id = c.id
        WHERE 1=1
    '''
    params = []

    if category_id and category_id != '1':  # 1 is "All" category
        query += ' AND tc.category_id = ?'
        params.append(category_id)

    if search:
        query += ' AND (tc.title LIKE ? OR tc.markdown_text LIKE ?)'
        search_term = f'%{search}%'
        params.extend([search_term, search_term])

    query += ' ORDER BY tc.created_at DESC'

    cursor.execute(query, params)
    cards = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(cards)

@app.route('/api/cards/<int:card_id>', methods=['GET'])
def get_card(card_id):
    conn = get_db()
    cursor = conn.cursor()

    # Update view count
    cursor.execute('UPDATE training_cards SET view_count = view_count + 1 WHERE id = ?', (card_id,))
    conn.commit()

    cursor.execute('''
        SELECT tc.*, c.name as category_name, c.name_swahili as category_name_swahili,
               c.name_korean as category_name_korean
        FROM training_cards tc
        LEFT JOIN categories c ON tc.category_id = c.id
        WHERE tc.id = ?
    ''', (card_id,))
    card = dict(cursor.fetchone())
    conn.close()
    return jsonify(card)

@app.route('/api/cards', methods=['POST'])
def create_card():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()

    # Convert video and audio lists to JSON strings
    video_urls = json.dumps(data.get('video_urls', [])) if isinstance(data.get('video_urls'), list) else data.get('video_urls', '[]')
    audio_urls = json.dumps(data.get('audio_urls', [])) if isinstance(data.get('audio_urls'), list) else data.get('audio_urls', '[]')

    cursor.execute('''
        INSERT INTO training_cards
        (title, title_swahili, title_korean, category_id, content_provider, target_audience,
         difficulty_level, markdown_text, html_content, image_url, video_url, audio_url,
         pdf_url, video_urls, audio_urls)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['title'], data.get('title_swahili'), data.get('title_korean'),
        data.get('category_id'), data.get('content_provider'), data.get('target_audience'),
        data.get('difficulty_level'), data.get('markdown_text'), data.get('html_content'),
        data.get('image_url'), data.get('video_url'), data.get('audio_url'),
        data.get('pdf_url'), video_urls, audio_urls
    ))

    conn.commit()
    card_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': card_id, 'message': 'Card created successfully'}), 201

@app.route('/api/cards/<int:card_id>', methods=['PUT'])
def update_card(card_id):
    data = request.json
    conn = get_db()
    cursor = conn.cursor()

    # Convert video and audio lists to JSON strings
    video_urls = json.dumps(data.get('video_urls', [])) if isinstance(data.get('video_urls'), list) else data.get('video_urls', '[]')
    audio_urls = json.dumps(data.get('audio_urls', [])) if isinstance(data.get('audio_urls'), list) else data.get('audio_urls', '[]')

    cursor.execute('''
        UPDATE training_cards
        SET title=?, title_swahili=?, title_korean=?, category_id=?, content_provider=?,
            target_audience=?, difficulty_level=?, markdown_text=?, html_content=?,
            image_url=?, video_url=?, audio_url=?, pdf_url=?, video_urls=?, audio_urls=?,
            updated_at=CURRENT_TIMESTAMP
        WHERE id=?
    ''', (
        data['title'], data.get('title_swahili'), data.get('title_korean'),
        data.get('category_id'), data.get('content_provider'), data.get('target_audience'),
        data.get('difficulty_level'), data.get('markdown_text'), data.get('html_content'),
        data.get('image_url'), data.get('video_url'), data.get('audio_url'),
        data.get('pdf_url'), video_urls, audio_urls, card_id
    ))

    conn.commit()
    conn.close()
    return jsonify({'message': 'Card updated successfully'})

@app.route('/api/cards/<int:card_id>', methods=['DELETE'])
def delete_card(card_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM training_cards WHERE id=?', (card_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Card deleted successfully'})

@app.route('/api/cards/<int:card_id>/like', methods=['POST'])
def like_card(card_id):
    data = request.json
    user_id = data.get('user_identifier', 'anonymous')

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute('INSERT INTO card_likes (card_id, user_identifier) VALUES (?, ?)',
                      (card_id, user_id))
        cursor.execute('UPDATE training_cards SET like_count = like_count + 1 WHERE id = ?',
                      (card_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Card liked successfully'})
    except sqlite3.IntegrityError:
        # Already liked
        cursor.execute('DELETE FROM card_likes WHERE card_id = ? AND user_identifier = ?',
                      (card_id, user_id))
        cursor.execute('UPDATE training_cards SET like_count = like_count - 1 WHERE id = ?',
                      (card_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Card unliked successfully'})

@app.route('/api/cards/<int:card_id>/comments', methods=['GET'])
def get_comments(card_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at DESC', (card_id,))
    comments = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(comments)

@app.route('/api/cards/<int:card_id>/comments', methods=['POST'])
def add_comment(card_id):
    data = request.json
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO comments (card_id, user_name, comment_text)
        VALUES (?, ?, ?)
    ''', (card_id, data['user_name'], data['comment_text']))

    conn.commit()
    comment_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': comment_id, 'message': 'Comment added successfully'}), 201

@app.route('/api/upload/<file_type>', methods=['POST'])
def upload_file(file_type):
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"

        # Determine subfolder based on file type
        subfolder = ''
        if file_type == 'image':
            subfolder = 'images'
        elif file_type == 'video':
            subfolder = 'videos'
        elif file_type == 'audio':
            subfolder = 'audios'
        elif file_type == 'pdf':
            subfolder = 'pdfs'

        filepath = os.path.join(app.config['UPLOAD_FOLDER'], subfolder, filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        file.save(filepath)

        file_url = f'/uploads/{subfolder}/{filename}'
        return jsonify({'url': file_url, 'message': 'File uploaded successfully'})

    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) as total_cards FROM training_cards')
    total_cards = cursor.fetchone()['total_cards']

    cursor.execute('SELECT SUM(view_count) as total_views FROM training_cards')
    total_views = cursor.fetchone()['total_views'] or 0

    cursor.execute('SELECT SUM(like_count) as total_likes FROM training_cards')
    total_likes = cursor.fetchone()['total_likes'] or 0

    cursor.execute('SELECT COUNT(*) as total_comments FROM comments')
    total_comments = cursor.fetchone()['total_comments']

    cursor.execute('''
        SELECT tc.id, tc.title, tc.view_count, tc.like_count,
               (SELECT COUNT(*) FROM comments WHERE card_id = tc.id) as comment_count
        FROM training_cards tc
        ORDER BY tc.view_count DESC
        LIMIT 5
    ''')
    top_cards = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return jsonify({
        'total_cards': total_cards,
        'total_views': total_views,
        'total_likes': total_likes,
        'total_comments': total_comments,
        'top_cards': top_cards
    })

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    if data.get('password') == 'q1':
        # Generate session token
        session_token = secrets.token_urlsafe(32)
        ADMIN_SESSIONS.add(session_token)
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'session_token': session_token
        })
    return jsonify({'success': False, 'message': 'Invalid password'}), 401

@app.route('/api/admin/verify', methods=['POST'])
def verify_admin_session():
    data = request.json
    session_token = data.get('session_token')
    if session_token and session_token in ADMIN_SESSIONS:
        return jsonify({'valid': True})
    return jsonify({'valid': False}), 401

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    data = request.json
    session_token = data.get('session_token')
    if session_token and session_token in ADMIN_SESSIONS:
        ADMIN_SESSIONS.discard(session_token)
    return jsonify({'success': True})

@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    data = request.json
    user_question = data.get('question', '')
    card_context = data.get('card_context', {})

    if not user_question:
        return jsonify({'error': 'Question is required'}), 400

    # Build context from the training card
    context_text = f"""You are a helpful medical device training assistant.
You are answering questions about: {card_context.get('title', 'a medical device')}.

Device Category: {card_context.get('category_name', 'N/A')}
Content Provider: {card_context.get('content_provider', 'N/A')}
Target Audience: {card_context.get('target_audience', 'Healthcare workers')}
Difficulty Level: {card_context.get('difficulty_level', 'N/A')}

Additional Information:
{card_context.get('markdown_text', '')}

User Question: {user_question}

Please provide a clear, concise, and helpful answer about this medical device. Focus on practical, actionable information for healthcare workers in Madagascar district hospitals."""

    try:
        response = requests.post(
            GROQ_API_URL,
            headers={
                'Authorization': f'Bearer {GROQ_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'llama-3.3-70b-versatile',
                'messages': [
                    {
                        'role': 'system',
                        'content': '''You are a helpful medical device training assistant for healthcare workers in Madagascar district hospitals. Provide clear, practical answers about medical equipment usage, maintenance, and troubleshooting.

IMPORTANT LANGUAGE GUIDELINES:
- When responding in Korean, use ONLY Hangul (한글) characters
- Do NOT mix Chinese characters (漢字/한자) with Korean unless absolutely necessary for technical medical terms that have no Korean equivalent
- Use pure Korean vocabulary whenever possible
- Avoid Sino-Korean words written in Chinese characters
- Write in clear, simple Korean that healthcare workers can easily understand

When responding in other languages:
- English: Use simple, clear English
- Swahili: Use standard Swahili vocabulary
- Always prioritize clarity and practical information over complex terminology'''
                    },
                    {
                        'role': 'user',
                        'content': context_text
                    }
                ],
                'temperature': 0.7,
                'max_tokens': 1024
            },
            timeout=30
        )

        if response.status_code == 200:
            ai_response = response.json()
            answer = ai_response['choices'][0]['message']['content']
            return jsonify({
                'success': True,
                'answer': answer
            })
        else:
            return jsonify({
                'error': f'Groq API error: {response.status_code}',
                'details': response.text
            }), 500

    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timeout. Please try again.'}), 504
    except Exception as e:
        return jsonify({'error': f'Error: {str(e)}'}), 500

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5045, debug=True)
