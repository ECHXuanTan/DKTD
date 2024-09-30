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
    type: mongoose.Schema.Types.Mixed, // Cho phép lưu cả ObjectId đơn lẻ và mảng ObjectId
    required: true,
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v) || (Array.isArray(v) && v.every(id => mongoose.Types.ObjectId.isValid(id)));
      },
      message: props => `${props.value} không phải là ObjectId hợp lệ hoặc mảng các ObjectId!`
    }
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