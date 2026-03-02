import React from 'react';

const StarRating = ({ rating, maxRating = 5, size = 'medium', onChange = null, readonly = true }) => {
  const sizeClasses = {
    small: 'star-small',
    medium: 'star-medium',
    large: 'star-large',
  };

  const stars = [];
  for (let i = 1; i <= maxRating; i++) {
    const filled = i <= rating;
    const halfFilled = i - 0.5 === rating;

    stars.push(
      <span
        key={i}
        className={`star ${sizeClasses[size]} ${filled ? 'star-filled' : halfFilled ? 'star-half' : 'star-empty'} ${
          !readonly ? 'star-interactive' : ''
        }`}
        onClick={() => !readonly && onChange && onChange(i)}
        style={{ cursor: readonly ? 'default' : 'pointer' }}
      >
        {filled || halfFilled ? '★' : '☆'}
      </span>
    );
  }

  return <div className="star-rating">{stars}</div>;
};

export default StarRating;
