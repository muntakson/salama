'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Nav,
  Tab,
  Alert,
  Badge,
} from 'react-bootstrap';
import axios from 'axios';
import { TrainingCard, Category, Stats } from '@/types';
import dynamic from 'next/dynamic';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<TrainingCard[]>([]);

  // Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    name_swahili: '',
    name_korean: '',
    description: '',
  });

  // Card Modal
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<TrainingCard | null>(null);
  const [cardForm, setCardForm] = useState({
    title: '',
    title_swahili: '',
    title_korean: '',
    category_id: '',
    content_provider: '',
    target_audience: '',
    difficulty_level: 'Beginner',
    markdown_text: '',
    html_content: '',
    image_url: '',
    video_url: '',
    audio_url: '',
  });

  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [alert, setAlert] = useState<{type: string; message: string} | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    }
  }, [isLoggedIn]);

  const loadData = async () => {
    try {
      const [statsRes, catsRes, cardsRes] = await Promise.all([
        axios.get('/api/stats'),
        axios.get('/api/categories'),
        axios.get('/api/cards'),
      ]);
      setStats(statsRes.data);
      setCategories(catsRes.data);
      setCards(cardsRes.data);
    } catch (error) {
      showAlert('danger', 'Error loading data');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/admin/login', { password });
      if (response.data.success) {
        setIsLoggedIn(true);
        setPassword('');
      }
    } catch (error) {
      showAlert('danger', 'Invalid password');
    }
  };

  const showAlert = (type: string, message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  // Category Management
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axios.put(`/api/categories/${editingCategory.id}`, categoryForm);
        showAlert('success', 'Category updated successfully');
      } else {
        await axios.post('/api/categories', categoryForm);
        showAlert('success', 'Category created successfully');
      }
      setShowCategoryModal(false);
      resetCategoryForm();
      await loadData();
    } catch (error) {
      showAlert('danger', 'Error saving category');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (confirm('Are you sure you want to delete this category?')) {
      try {
        await axios.delete(`/api/categories/${id}`);
        showAlert('success', 'Category deleted successfully');
        await loadData();
      } catch (error) {
        showAlert('danger', 'Error deleting category');
      }
    }
  };

  const editCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      name_swahili: category.name_swahili || '',
      name_korean: category.name_korean || '',
      description: category.description || '',
    });
    setShowCategoryModal(true);
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      name_swahili: '',
      name_korean: '',
      description: '',
    });
  };

  // Card Management
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...cardForm,
        category_id: cardForm.category_id ? parseInt(cardForm.category_id) : null,
      };

      if (editingCard) {
        await axios.put(`/api/cards/${editingCard.id}`, payload);
        showAlert('success', 'Training card updated successfully');
      } else {
        await axios.post('/api/cards', payload);
        showAlert('success', 'Training card created successfully');
      }
      setShowCardModal(false);
      resetCardForm();
      await loadData();
    } catch (error) {
      showAlert('danger', 'Error saving training card');
    }
  };

  const handleDeleteCard = async (id: number) => {
    if (confirm('Are you sure you want to delete this training card?')) {
      try {
        await axios.delete(`/api/cards/${id}`);
        showAlert('success', 'Training card deleted successfully');
        await loadData();
      } catch (error) {
        showAlert('danger', 'Error deleting training card');
      }
    }
  };

  const editCard = (card: TrainingCard) => {
    setEditingCard(card);
    setCardForm({
      title: card.title,
      title_swahili: card.title_swahili || '',
      title_korean: card.title_korean || '',
      category_id: card.category_id?.toString() || '',
      content_provider: card.content_provider || '',
      target_audience: card.target_audience || '',
      difficulty_level: card.difficulty_level || 'Beginner',
      markdown_text: card.markdown_text || '',
      html_content: card.html_content || '',
      image_url: card.image_url || '',
      video_url: card.video_url || '',
      audio_url: card.audio_url || '',
    });
    setShowCardModal(true);
  };

  const resetCardForm = () => {
    setEditingCard(null);
    setCardForm({
      title: '',
      title_swahili: '',
      title_korean: '',
      category_id: '',
      content_provider: '',
      target_audience: '',
      difficulty_level: 'Beginner',
      markdown_text: '',
      html_content: '',
      image_url: '',
      video_url: '',
      audio_url: '',
    });
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'image' | 'video' | 'audio'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`/api/upload/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (type === 'image') {
        setCardForm({ ...cardForm, image_url: response.data.url });
      } else if (type === 'video') {
        setCardForm({ ...cardForm, video_url: response.data.url });
      } else if (type === 'audio') {
        setCardForm({ ...cardForm, audio_url: response.data.url });
      }

      showAlert('success', 'File uploaded successfully');
    } catch (error) {
      showAlert('danger', 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <Container className="mt-5">
        <Row className="justify-content-center">
          <Col md={4}>
            <Card>
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">Admin Login</h5>
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleLogin}>
                  <Form.Group className="mb-3">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter admin password"
                      required
                    />
                  </Form.Group>
                  <Button type="submit" variant="primary" className="w-100">
                    Login
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {alert && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Admin Dashboard</h2>
        <Button variant="outline-primary" href="/">
          Back to Home
        </Button>
      </div>

      <Tab.Container activeKey={activeTab} onSelect={(k) => k && setActiveTab(k)}>
        <Nav variant="tabs" className="mb-4">
          <Nav.Item>
            <Nav.Link eventKey="overview">Overview</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="cards">Training Cards</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="categories">Categories</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="overview">
            {stats && (
              <>
                <Row className="mb-4">
                  <Col md={3}>
                    <Card className="text-center">
                      <Card.Body>
                        <h1 className="text-primary">{stats.total_cards}</h1>
                        <p className="text-muted mb-0">Total Cards</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center">
                      <Card.Body>
                        <h1 className="text-success">{stats.total_views}</h1>
                        <p className="text-muted mb-0">Total Views</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center">
                      <Card.Body>
                        <h1 className="text-danger">{stats.total_likes}</h1>
                        <p className="text-muted mb-0">Total Likes</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center">
                      <Card.Body>
                        <h1 className="text-info">{stats.total_comments}</h1>
                        <p className="text-muted mb-0">Total Comments</p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Top Performing Cards</h5>
                  </Card.Header>
                  <Card.Body>
                    <Table striped hover responsive>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Views</th>
                          <th>Likes</th>
                          <th>Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.top_cards.map((card) => (
                          <tr key={card.id}>
                            <td>{card.title}</td>
                            <td>{card.view_count}</td>
                            <td>{card.like_count}</td>
                            <td>{card.comment_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </>
            )}
          </Tab.Pane>

          <Tab.Pane eventKey="cards">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4>Training Cards ({cards.length})</h4>
              <Button
                variant="primary"
                onClick={() => {
                  resetCardForm();
                  setShowCardModal(true);
                }}
              >
                + Create New Card
              </Button>
            </div>

            <Card>
              <Card.Body>
                <Table striped hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Difficulty</th>
                      <th>Views</th>
                      <th>Likes</th>
                      <th>Comments</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((card) => (
                      <tr key={card.id}>
                        <td>{card.id}</td>
                        <td>{card.title}</td>
                        <td>{card.category_name || 'N/A'}</td>
                        <td>
                          <Badge
                            bg={
                              card.difficulty_level === 'Beginner'
                                ? 'success'
                                : card.difficulty_level === 'Intermediate'
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {card.difficulty_level}
                          </Badge>
                        </td>
                        <td>{card.view_count}</td>
                        <td>{card.like_count}</td>
                        <td>{card.comment_count || 0}</td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => editCard(card)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteCard(card.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="categories">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4>Categories ({categories.length})</h4>
              <Button
                variant="primary"
                onClick={() => {
                  resetCategoryForm();
                  setShowCategoryModal(true);
                }}
              >
                + Create New Category
              </Button>
            </div>

            <Card>
              <Card.Body>
                <Table striped hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name (English)</th>
                      <th>Name (Swahili)</th>
                      <th>Name (Korean)</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr key={cat.id}>
                        <td>{cat.id}</td>
                        <td>{cat.name}</td>
                        <td>{cat.name_swahili || '-'}</td>
                        <td>{cat.name_korean || '-'}</td>
                        <td>{cat.description || '-'}</td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => editCategory(cat)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteCategory(cat.id)}
                            disabled={cat.id === 1}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* Category Modal */}
      <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingCategory ? 'Edit Category' : 'Create New Category'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCategorySubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name (English) *</Form.Label>
              <Form.Control
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Name (Swahili)</Form.Label>
              <Form.Control
                type="text"
                value={categoryForm.name_swahili}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name_swahili: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Name (Korean)</Form.Label>
              <Form.Control
                type="text"
                value={categoryForm.name_korean}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name_korean: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, description: e.target.value })
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Card Modal */}
      <Modal
        show={showCardModal}
        onHide={() => setShowCardModal(false)}
        size="xl"
        fullscreen="lg-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>{editingCard ? 'Edit Training Card' : 'Create New Training Card'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCardSubmit}>
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Title (English) *</Form.Label>
                  <Form.Control
                    type="text"
                    value={cardForm.title}
                    onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Select
                    value={cardForm.category_id}
                    onChange={(e) => setCardForm({ ...cardForm, category_id: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Title (Swahili)</Form.Label>
                  <Form.Control
                    type="text"
                    value={cardForm.title_swahili}
                    onChange={(e) => setCardForm({ ...cardForm, title_swahili: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Title (Korean)</Form.Label>
                  <Form.Control
                    type="text"
                    value={cardForm.title_korean}
                    onChange={(e) => setCardForm({ ...cardForm, title_korean: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Content Provider</Form.Label>
                  <Form.Control
                    type="text"
                    value={cardForm.content_provider}
                    onChange={(e) =>
                      setCardForm({ ...cardForm, content_provider: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Target Audience</Form.Label>
                  <Form.Control
                    type="text"
                    value={cardForm.target_audience}
                    onChange={(e) =>
                      setCardForm({ ...cardForm, target_audience: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Difficulty Level</Form.Label>
                  <Form.Select
                    value={cardForm.difficulty_level}
                    onChange={(e) =>
                      setCardForm({ ...cardForm, difficulty_level: e.target.value })
                    }
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Markdown Text</Form.Label>
              <div data-color-mode="light">
                <MDEditor
                  value={cardForm.markdown_text}
                  onChange={(val) => setCardForm({ ...cardForm, markdown_text: val || '' })}
                  height={200}
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>HTML Content</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={cardForm.html_content}
                onChange={(e) => setCardForm({ ...cardForm, html_content: e.target.value })}
                placeholder="Paste HTML code here..."
              />
            </Form.Group>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Image Upload</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={(e: any) => handleFileUpload(e, 'image')}
                    disabled={uploading}
                  />
                  {cardForm.image_url && (
                    <div className="mt-2">
                      <img src={cardForm.image_url} alt="Preview" className="img-thumbnail" style={{ maxHeight: '100px' }} />
                    </div>
                  )}
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Video Upload (MP4)</Form.Label>
                  <Form.Control
                    type="file"
                    accept="video/mp4"
                    onChange={(e: any) => handleFileUpload(e, 'video')}
                    disabled={uploading}
                  />
                  {cardForm.video_url && (
                    <small className="text-success d-block mt-1">Video uploaded</small>
                  )}
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Audio Upload (MP3)</Form.Label>
                  <Form.Control
                    type="file"
                    accept="audio/*"
                    onChange={(e: any) => handleFileUpload(e, 'audio')}
                    disabled={uploading}
                  />
                  {cardForm.audio_url && (
                    <small className="text-success d-block mt-1">Audio uploaded</small>
                  )}
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCardModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={uploading}>
              {uploading ? 'Uploading...' : editingCard ? 'Update Card' : 'Create Card'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
