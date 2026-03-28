/**
 * AI Routes
 * @module routes/ai
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const aiController = require('../controllers/aiController');

router.use(authenticate);

router.get('/lyrics', aiController.getLyrics);

router.get('/track/:id/analysis', aiController.getTrackAnalysis);

router.post('/track/:id/reanalyze', aiController.reanalyzeTrack);

router.post('/genre-tag', aiController.requestGenreTagging);

router.post('/mix-feedback', aiController.requestMixFeedback);

module.exports = router;
