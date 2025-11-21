# Salama - Medical Device Training Portal

## Project Overview

Salama is a comprehensive medical device training portal designed for Madagascar district hospitals. The platform helps healthcare workers learn about medical device usage, repair, and maintenance through multilingual training materials.

## Mission

Addressing the critical shortage of essential medical equipment and lack of equipment maintenance infrastructure in Madagascar district hospitals by providing:
- Online training platform for medical device usage
- Multilingual content (English, Swahili, Korean)
- AI-generated training content
- Comprehensive device maintenance guides

## Technology Stack

- **Frontend**: Next.js 14.2 with TypeScript
- **Backend**: Flask 3.0 (Python)
- **Database**: SQLite3
- **UI Framework**: Bootstrap 5 + React Bootstrap
- **Markdown Editor**: @uiw/react-md-editor
- **Deployment**: nginx reverse proxy on Ubuntu server

## Port Configuration

- **Backend (Flask)**: Port 5008
- **Frontend (Next.js)**: Port 3006
- **Domain**: salama.aiedus.org

## Project Structure

```
/var/www/salama/
├── backend/
│   ├── app.py                 # Main Flask application
│   ├── requirements.txt       # Python dependencies
│   ├── medical_training.db    # SQLite database
│   └── uploads/              # User uploaded files
│       ├── images/
│       ├── videos/
│       └── audios/
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # Main user interface
│   │   ├── admin/
│   │   │   └── page.tsx      # Admin dashboard
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── TrainingCard.tsx  # Reusable card component
│   ├── types/
│   │   └── index.ts          # TypeScript definitions
│   └── next.config.mjs
└── CLAUDE.md                  # This file
```

## Database Schema

### Tables

1. **categories**
   - id, name, name_swahili, name_korean, description
   - Stores device categories (Suction Pumps, Lighting, Surgery Equipment, etc.)

2. **training_cards**
   - id, title (multilingual), category_id, content_provider, target_audience
   - difficulty_level, markdown_text, html_content, image_url, video_url, audio_url
   - view_count, like_count, created_at, updated_at

3. **comments**
   - id, card_id, user_name, comment_text, created_at

4. **card_likes**
   - id, card_id, user_identifier, created_at
   - Prevents duplicate likes

## Key Features

### User Interface
- Training card grid with category filtering
- Multilingual support (English/Swahili/Korean)
- Collapsible sections for text, HTML, video, audio
- Full-screen card view modal
- Comment system with user names
- Like/unlike functionality
- Search functionality
- Responsive design (mobile/desktop)

### Admin Dashboard
- System overview with statistics
- Training card management (CRUD)
- Category management (CRUD)
- File upload for images, videos, audio
- Markdown editor for content
- HTML content editor
- Difficulty level assignment
- Target audience specification

### Training Card Components
- **Markdown Text**: Rendered markdown content
- **HTML Content**: Custom HTML for diagrams/instructions
- **Images**: Device photos and illustrations
- **Videos**: MP4 format maintenance tutorials
- **Audio**: MP3 format audio guides
- **Metadata**: Provider, audience, difficulty, category

## API Endpoints

### Categories
- GET `/api/categories` - List all categories
- POST `/api/categories` - Create new category
- PUT `/api/categories/:id` - Update category
- DELETE `/api/categories/:id` - Delete category

### Training Cards
- GET `/api/cards` - List cards (with filters)
- GET `/api/cards/:id` - Get single card (increments view count)
- POST `/api/cards` - Create new card
- PUT `/api/cards/:id` - Update card
- DELETE `/api/cards/:id` - Delete card
- POST `/api/cards/:id/like` - Toggle like/unlike
- GET `/api/cards/:id/comments` - Get comments
- POST `/api/cards/:id/comments` - Add comment

### File Uploads
- POST `/api/upload/image` - Upload image
- POST `/api/upload/video` - Upload video (MP4)
- POST `/api/upload/audio` - Upload audio (MP3)
- Max file size: 500MB

### Admin
- POST `/api/admin/login` - Admin login (password: q1)

### Statistics
- GET `/api/stats` - System overview statistics

## Running the Application

### Backend
```bash
cd /var/www/salama/backend
pip3 install -r requirements.txt
nohup python3 app.py > app.log 2>&1 &
```

### Frontend
```bash
cd /var/www/salama/frontend
npm install
PORT=3006 nohup npm run dev > /tmp/salama-frontend.log 2>&1 &
```

### Check Running Services
```bash
# Backend
lsof -i :5008
tail -f /var/www/salama/backend/app.log

# Frontend
lsof -i :3006
tail -f /tmp/salama-frontend.log
```

### Nginx Configuration
- Config file: `/etc/nginx/sites-available/salama.aiedus.org.conf`
- SSL: Cloudflare Origin Certificate
- Ports: 80 (HTTP) and 443 (HTTPS)
- Proxies:
  - `/` → Frontend (port 3006)
  - `/api/` → Backend (port 5008)
  - `/uploads/` → Backend (port 5008)

### Reload Nginx
```bash
echo 'q1' | sudo -S nginx -t
echo 'q1' | sudo -S systemctl reload nginx
```

## Admin Access

- **URL**: https://salama.aiedus.org/admin
- **Password**: q1

## Default Categories

1. All - Yote - 모두
2. Suction Pumps - Pampu za Kunyonya - 석션 펌프
3. Lighting - Taa - 조명
4. Surgery Equipment - Vifaa vya Upasuaji - 수술 장비
5. Diagnostic Equipment - Vifaa vya Uchunguzi - 진단 장비
6. Patient Monitoring - Ufuatiliaji wa Wagonjwa - 환자 모니터링
7. Sterilization - Usafi - 멸균
8. Laboratory Equipment - Vifaa vya Maabara - 실험실 장비

## Troubleshooting

### Backend not starting
```bash
cd /var/www/salama/backend
cat app.log
# Check if port is in use
lsof -i :5008
```

### Frontend not starting
```bash
cat /tmp/salama-frontend.log
# Check if port is in use
lsof -i :3006
```

### File upload issues
- Check upload directory permissions: `/var/www/salama/backend/uploads/`
- Verify max file size in nginx: `client_max_body_size 500M;`
- Check Flask config: `MAX_CONTENT_LENGTH = 500 * 1024 * 1024`

### Database issues
```bash
cd /var/www/salama/backend
sqlite3 medical_training.db
.tables
.schema training_cards
```

## Future Enhancements

- [ ] AI-powered content generation integration
- [ ] Video streaming optimization
- [ ] Offline mode support
- [ ] Print-friendly training guides
- [ ] User authentication and roles
- [ ] Progress tracking for learners
- [ ] Certificate generation
- [ ] Multi-language OCR for device labels
- [ ] AR-based device identification

## Contact

- Support: support@salama-training.org
- Phone: +261 XX XXX XXXX

## Last Updated

November 20, 2025
