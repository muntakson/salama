'use client';

import { useState } from 'react';
import { Card, Collapse, Badge, Button } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';
import { TrainingCard as TrainingCardType, Language } from '@/types';
import axios from 'axios';

interface TrainingCardProps {
  card: TrainingCardType;
  language: Language;
  onFullScreen: (card: TrainingCardType) => void;
  onLike: (cardId: number) => void;
  onComment: (cardId: number, userName: string, comment: string) => void;
  isAdmin?: boolean;
}

export default function TrainingCard({
  card,
  language,
  onFullScreen,
  onLike,
  onComment,
  isAdmin = false,
}: TrainingCardProps) {
  const [showText, setShowText] = useState(false);
  const [showHtml, setShowHtml] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [showMultipleVideos, setShowMultipleVideos] = useState(false);
  const [showMultipleAudios, setShowMultipleAudios] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [userName, setUserName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiAnswer, setShowAiAnswer] = useState(true);

  const getTitle = () => {
    if (language === 'sw' && card.title_swahili) return card.title_swahili;
    if (language === 'ko' && card.title_korean) return card.title_korean;
    return card.title;
  };

  const getCategoryName = () => {
    if (language === 'sw' && card.category_name_swahili) return card.category_name_swahili;
    if (language === 'ko' && card.category_name_korean) return card.category_name_korean;
    return card.category_name || 'Uncategorized';
  };

  const getDifficultyBadge = () => {
    const level = card.difficulty_level || 'Beginner';
    const colors: { [key: string]: string } = {
      Beginner: 'success',
      Intermediate: 'warning',
      Advanced: 'danger',
    };
    return <Badge bg={colors[level] || 'secondary'}>{level}</Badge>;
  };

  const loadComments = async () => {
    try {
      const response = await axios.get(`/api/cards/${card.id}/comments`);
      setComments(response.data);
      setShowComments(true);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!userName.trim() || !commentText.trim()) {
      alert('Please enter your name and comment');
      return;
    }

    try {
      await onComment(card.id, userName, commentText);
      setUserName('');
      setCommentText('');
      await loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleAiQuestion = async () => {
    if (!aiQuestion.trim()) {
      alert('Please enter a question');
      return;
    }

    setAiLoading(true);
    try {
      const response = await axios.post('/api/ai/chat', {
        question: aiQuestion,
        card_context: {
          title: card.title,
          category_name: card.category_name,
          content_provider: card.content_provider,
          target_audience: card.target_audience,
          difficulty_level: card.difficulty_level,
          markdown_text: card.markdown_text
        }
      });

      if (response.data.success) {
        setAiAnswer(response.data.answer);
        setShowAiAnswer(true); // Auto-expand answer when received
      } else {
        setAiAnswer('Sorry, there was an error processing your question.');
        setShowAiAnswer(true);
      }
    } catch (error) {
      console.error('Error asking AI:', error);
      setAiAnswer('Sorry, I could not connect to the AI assistant. Please try again later.');
      setShowAiAnswer(true);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Card className="mb-3 shadow-sm">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-1">{getTitle()}</h5>
          <small className="text-muted">
            {getCategoryName()} • {getDifficultyBadge()} • {card.content_provider || 'Unknown'}
          </small>
        </div>
        <div className="d-flex gap-2">
          {isAdmin && (
            <Button
              variant="warning"
              size="sm"
              onClick={() => window.location.href = `/admin?edit=${card.id}`}
            >
              ✏ Edit
            </Button>
          )}
          <Button variant="outline-primary" size="sm" onClick={() => onFullScreen(card)}>
            ⛶ Full Screen
          </Button>
        </div>
      </Card.Header>

      {card.image_url && (
        <div className="text-center bg-light p-2">
          <img
            src={card.image_url}
            alt={getTitle()}
            style={{ maxWidth: '50%', height: 'auto', objectFit: 'contain' }}
            className="img-fluid"
          />
        </div>
      )}

      <Card.Body>
        <div className="mb-3">
          <small className="text-muted">
            Target: {card.target_audience || 'All'} | Views: {card.view_count} | Likes: {card.like_count}
            {card.comment_count ? ` | Comments: ${card.comment_count}` : ''}
          </small>
        </div>

        {card.markdown_text && (
          <>
            <Button
              variant="link"
              onClick={() => setShowText(!showText)}
              aria-expanded={showText}
              className="p-0 text-decoration-none mb-2"
            >
              {showText ? '▼' : '▶'} Text Content
            </Button>
            <Collapse in={showText}>
              <div className="border rounded p-3 bg-light">
                <ReactMarkdown>{card.markdown_text}</ReactMarkdown>
              </div>
            </Collapse>
          </>
        )}

        {card.html_content && (
          <>
            <Button
              variant="link"
              onClick={() => setShowHtml(!showHtml)}
              aria-expanded={showHtml}
              className="p-0 text-decoration-none mb-2"
            >
              {showHtml ? '▼' : '▶'} HTML Content
            </Button>
            <Collapse in={showHtml}>
              <div
                className="border rounded p-3 bg-white"
                dangerouslySetInnerHTML={{ __html: card.html_content }}
              />
            </Collapse>
          </>
        )}

        {card.video_url && (
          <>
            <Button
              variant="link"
              onClick={() => setShowVideo(!showVideo)}
              aria-expanded={showVideo}
              className="p-0 text-decoration-none mb-2"
            >
              {showVideo ? '▼' : '▶'} Video
            </Button>
            <Collapse in={showVideo}>
              <div className="border rounded p-2 bg-dark">
                <video controls className="w-100" style={{ maxHeight: '400px' }}>
                  <source src={card.video_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </Collapse>
          </>
        )}

        {card.audio_url && (
          <>
            <Button
              variant="link"
              onClick={() => setShowAudio(!showAudio)}
              aria-expanded={showAudio}
              className="p-0 text-decoration-none mb-2"
            >
              {showAudio ? '▼' : '▶'} Audio
            </Button>
            <Collapse in={showAudio}>
              <div className="border rounded p-2 bg-light">
                <audio controls className="w-100">
                  <source src={card.audio_url} type="audio/mpeg" />
                  <source src={card.audio_url} type="audio/mp4" />
                  Your browser does not support the audio tag.
                </audio>
              </div>
            </Collapse>
          </>
        )}

        {card.pdf_url && (
          <>
            <Button
              variant="link"
              onClick={() => setShowPdf(!showPdf)}
              aria-expanded={showPdf}
              className="p-0 text-decoration-none mb-2"
            >
              {showPdf ? '▼' : '▶'} PDF Manual
            </Button>
            <Collapse in={showPdf}>
              <div className="border rounded p-2 bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">User Manual</span>
                  <a
                    href={card.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-primary"
                  >
                    Open in New Tab
                  </a>
                </div>
                <iframe
                  src={card.pdf_url}
                  style={{ width: '100%', height: '500px', border: 'none' }}
                  title="PDF Manual"
                />
              </div>
            </Collapse>
          </>
        )}

        {(() => {
          let videoUrls: string[] = [];
          if (card.video_urls) {
            videoUrls = typeof card.video_urls === 'string' ? JSON.parse(card.video_urls) : card.video_urls;
          }
          return videoUrls.length > 0 && (
            <>
              <Button
                variant="link"
                onClick={() => setShowMultipleVideos(!showMultipleVideos)}
                aria-expanded={showMultipleVideos}
                className="p-0 text-decoration-none mb-2"
              >
                {showMultipleVideos ? '▼' : '▶'} Videos ({videoUrls.length})
              </Button>
              <Collapse in={showMultipleVideos}>
                <div className="border rounded p-2 bg-dark">
                  {videoUrls.map((url, idx) => (
                    <div key={idx} className="mb-3">
                      <small className="text-white d-block mb-1">Video {idx + 1}</small>
                      <video controls className="w-100" style={{ maxHeight: '400px' }}>
                        <source src={url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ))}
                </div>
              </Collapse>
            </>
          );
        })()}

        {(() => {
          let audioUrls: string[] = [];
          if (card.audio_urls) {
            audioUrls = typeof card.audio_urls === 'string' ? JSON.parse(card.audio_urls) : card.audio_urls;
          }
          return audioUrls.length > 0 && (
            <>
              <Button
                variant="link"
                onClick={() => setShowMultipleAudios(!showMultipleAudios)}
                aria-expanded={showMultipleAudios}
                className="p-0 text-decoration-none mb-2"
              >
                {showMultipleAudios ? '▼' : '▶'} Audio Guides ({audioUrls.length})
              </Button>
              <Collapse in={showMultipleAudios}>
                <div className="border rounded p-2 bg-light">
                  {audioUrls.map((url, idx) => (
                    <div key={idx} className="mb-3">
                      <small className="d-block mb-1">Audio Guide {idx + 1}</small>
                      <audio controls className="w-100">
                        <source src={url} type="audio/mpeg" />
                        <source src={url} type="audio/mp4" />
                        Your browser does not support the audio tag.
                      </audio>
                    </div>
                  ))}
                </div>
              </Collapse>
            </>
          );
        })()}

        <div className="d-flex gap-2 mt-3">
          <Button variant="primary" size="sm" onClick={() => onLike(card.id)}>
            ❤ Like ({card.like_count})
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!showComments) loadComments();
              else setShowComments(!showComments);
            }}
          >
            💬 Comments ({card.comment_count || 0})
          </Button>
        </div>

        <Collapse in={showComments}>
          <div className="mt-3">
            <div className="mb-3">
              <input
                type="text"
                className="form-control form-control-sm mb-2"
                placeholder="Your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
              <textarea
                className="form-control form-control-sm mb-2"
                placeholder="Add a comment..."
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <Button variant="primary" size="sm" onClick={handleAddComment}>
                Post Comment
              </Button>
            </div>
            <div className="border-top pt-3">
              {comments.length === 0 ? (
                <p className="text-muted">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="mb-2 pb-2 border-bottom">
                    <strong>{comment.user_name}</strong>
                    <small className="text-muted ms-2">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </small>
                    <p className="mb-0">{comment.comment_text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </Collapse>

        {/* AI Assistant */}
        <div className="mt-4 pt-3 border-top">
          <h6 className="mb-3">🤖 AI Medical Device Assistant</h6>
          <div className="d-flex gap-2 mb-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Ask a question about this medical device..."
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAiQuestion()}
              disabled={aiLoading}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleAiQuestion}
              disabled={aiLoading || !aiQuestion.trim()}
              style={{ minWidth: '80px' }}
            >
              {aiLoading ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              ) : (
                '🤖 Ask AI'
              )}
            </Button>
          </div>
          {aiAnswer && (
            <>
              <Button
                variant="link"
                onClick={() => setShowAiAnswer(!showAiAnswer)}
                aria-expanded={showAiAnswer}
                className="p-0 text-decoration-none mt-2"
              >
                {showAiAnswer ? '▼' : '▶'} AI Answer
              </Button>
              <Collapse in={showAiAnswer}>
                <div className="alert alert-info mt-2 mb-0" style={{ fontSize: '0.9rem' }}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{aiAnswer}</div>
                </div>
              </Collapse>
            </>
          )}
        </div>
      </Card.Body>

      <Card.Footer className="text-muted">
        <small>Created: {new Date(card.created_at).toLocaleDateString()}</small>
      </Card.Footer>
    </Card>
  );
}
