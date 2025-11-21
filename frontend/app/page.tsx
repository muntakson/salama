'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Navbar,
  Nav,
  Form,
  Modal,
  Button,
  Offcanvas,
} from 'react-bootstrap';
import TrainingCard from '@/components/TrainingCard';
import { TrainingCard as TrainingCardType, Category, Language } from '@/types';
import axios from 'axios';
import Link from 'next/link';

export default function Home() {
  const [cards, setCards] = useState<TrainingCardType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>(1);
  const [language, setLanguage] = useState<Language>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [fullScreenCard, setFullScreenCard] = useState<TrainingCardType | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    checkAdminSession();
    loadCategories();
    loadCards();
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    setMounted(true);

    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load high contrast preference
    const savedContrast = localStorage.getItem('high_contrast');
    if (savedContrast === 'true') {
      setHighContrast(true);
      document.body.classList.add('high-contrast-mode');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleHighContrast = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    localStorage.setItem('high_contrast', newValue.toString());

    if (newValue) {
      document.body.classList.add('high-contrast-mode');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }
  };

  const checkAdminSession = async () => {
    const sessionToken = localStorage.getItem('admin_session_token');
    if (sessionToken) {
      try {
        const response = await axios.post('/api/admin/verify', {
          session_token: sessionToken
        });
        if (response.data.valid) {
          setIsAdmin(true);
        }
      } catch (error) {
        setIsAdmin(false);
      }
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadCards = async () => {
    try {
      const params: any = {};
      if (selectedCategory !== 1) params.category_id = selectedCategory;
      if (searchQuery) params.search = searchQuery;

      const response = await axios.get('/api/cards', { params });
      setCards(response.data);
    } catch (error) {
      console.error('Error loading cards:', error);
    }
  };

  const handleLike = async (cardId: number) => {
    try {
      await axios.post(`/api/cards/${cardId}/like`, {
        user_identifier: 'user_' + Math.random().toString(36).substr(2, 9),
      });
      await loadCards();
    } catch (error) {
      console.error('Error liking card:', error);
    }
  };

  const handleComment = async (cardId: number, userName: string, commentText: string) => {
    try {
      await axios.post(`/api/cards/${cardId}/comments`, {
        user_name: userName,
        comment_text: commentText,
      });
      await loadCards();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const getCategoryName = (cat: Category) => {
    if (language === 'sw' && cat.name_swahili) return cat.name_swahili;
    if (language === 'ko' && cat.name_korean) return cat.name_korean;
    return cat.name;
  };

  const getLanguageLabel = (lang: Language) => {
    const labels = {
      en: 'English',
      sw: 'Kiswahili',
      ko: '한국어',
    };
    return labels[lang];
  };

  return (
    <>
      <Navbar bg="primary" variant="dark" expand="lg" sticky="top" className="lamba-pattern">
        <Container fluid>
          <Navbar.Brand href="/" className="fw-bold">
            🏥 Salama Medical Training
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-navbar" />
          <Navbar.Collapse id="main-navbar">
            <Nav className="me-auto">
              <Nav.Link href="/">Home</Nav.Link>
              <Nav.Link href="/admin">Admin Dashboard</Nav.Link>
            </Nav>
            <Form className="d-flex me-2">
              <Form.Control
                type="search"
                placeholder="Search training materials..."
                className="me-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Form>
            <Button
              variant="outline-light"
              size="sm"
              className="me-2"
              onClick={toggleHighContrast}
              title="Toggle High Contrast Mode"
            >
              {highContrast ? '🌙' : '☀️'}
            </Button>
            <Form.Select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-auto"
            >
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
              <option value="ko">한국어</option>
            </Form.Select>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Offline Indicator */}
      {mounted && !isOnline && (
        <div className="offline-indicator">
          <i className="bi bi-wifi-off me-2"></i>
          {language === 'ko' ? '오프라인 모드' : language === 'sw' ? 'Hali ya nje ya mtandao' : 'Offline Mode'}
        </div>
      )}

      <Container fluid className="mt-4">
        <Row>
          <Col lg={2} className="d-none d-lg-block">
            <div className="sticky-top" style={{ top: '80px' }}>
              <h5 className="mb-3">Categories</h5>
              <Nav className="flex-column">
                {categories.map((cat) => (
                  <Nav.Link
                    key={cat.id}
                    active={selectedCategory === cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="text-start"
                  >
                    {getCategoryName(cat)}
                  </Nav.Link>
                ))}
              </Nav>
            </div>
          </Col>

          <Col lg={10}>
            <div className="d-lg-none mb-3">
              <Button variant="primary" onClick={() => setShowMenu(true)}>
                ☰ Categories
              </Button>
            </div>

            {cards.length === 0 ? (
              <div className="text-center py-5">
                <h4 className="text-muted">No training materials found</h4>
                <p className="text-muted">Try selecting a different category or search term</p>
              </div>
            ) : (
              <Row>
                {cards.map((card) => (
                  <Col key={card.id} lg={6} xl={4} className="mb-4">
                    <TrainingCard
                      card={card}
                      language={language}
                      onFullScreen={setFullScreenCard}
                      onLike={handleLike}
                      onComment={handleComment}
                      isAdmin={isAdmin}
                    />
                  </Col>
                ))}
              </Row>
            )}
          </Col>
        </Row>
      </Container>

      <Offcanvas show={showMenu} onHide={() => setShowMenu(false)} placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Categories</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column">
            {categories.map((cat) => (
              <Nav.Link
                key={cat.id}
                active={selectedCategory === cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setShowMenu(false);
                }}
              >
                {getCategoryName(cat)}
              </Nav.Link>
            ))}
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>

      <Modal
        show={fullScreenCard !== null}
        onHide={() => setFullScreenCard(null)}
        size="xl"
        fullscreen="lg-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {fullScreenCard &&
              (language === 'sw' && fullScreenCard.title_swahili
                ? fullScreenCard.title_swahili
                : language === 'ko' && fullScreenCard.title_korean
                ? fullScreenCard.title_korean
                : fullScreenCard.title)}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {fullScreenCard && (
            <TrainingCard
              card={fullScreenCard}
              language={language}
              onFullScreen={() => {}}
              onLike={handleLike}
              onComment={handleComment}
              isAdmin={isAdmin}
            />
          )}
        </Modal.Body>
      </Modal>

      <footer className="bg-dark text-white mt-5 py-4 lamba-pattern">
        <Container>
          <Row>
            <Col md={6}>
              <h5>🏥 Salama Medical Training Portal</h5>
              <p>
                {mounted && language === 'ko' ? '마다가스카르 지역 병원 의료진 역량 강화' :
                 mounted && language === 'sw' ? 'Kuwawezesha wafanyakazi wa afya katika hospitali za wilaya za Madagascar' :
                 'Empowering healthcare workers in Madagascar district hospitals'}
              </p>
            </Col>
            <Col md={6} className="text-md-end">
              <p>
                {mounted && language === 'ko' ? '이메일' : mounted && language === 'sw' ? 'Barua pepe' : 'Email'}: support@salama-training.org
              </p>
              <p>
                {mounted && language === 'ko' ? '전화' : mounted && language === 'sw' ? 'Simu' : 'Phone'}: +261 XX XXX XXXX
              </p>
            </Col>
          </Row>
        </Container>
      </footer>
    </>
  );
}
