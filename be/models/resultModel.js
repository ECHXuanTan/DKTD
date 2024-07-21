import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE'],
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  entityType: {
    type: String,
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  dataBefore: {
    type: mongoose.Schema.Types.Mixed
  },
  dataAfter: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const Result = mongoose.model('Result', resultSchema);

export default Result;