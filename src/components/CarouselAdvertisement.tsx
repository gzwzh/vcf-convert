import React, { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getAdvertisement, openAdvertisementLink, Advertisement } from '../utils/adService';
import './CarouselAdvertisement.css';

const CarouselAdvertisement: React.FC = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAds = async () => {
      setLoading(true);
      const ad1 = await getAdvertisement('adv_position_04');
      const ad2 = await getAdvertisement('adv_position_05');
      const fetchedAds = [ad1, ad2].filter((ad): ad is Advertisement => ad !== null);
      setAds(fetchedAds);
      setLoading(false);
    };

    fetchAds();
    // 每5分钟刷新一次广告
    const refreshInterval = setInterval(fetchAds, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  // 轮播效果：每3秒切换一次
  useEffect(() => {
    if (ads.length === 0) return;

    const carouselInterval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % ads.length);
    }, 3000);

    return () => clearInterval(carouselInterval);
  }, [ads.length]);

  if (loading) {
    return (
      <div className="carousel-ad carousel-ad-loading">
        <Spin size="small" />
      </div>
    );
  }

  if (ads.length === 0) {
    return null;
  }

  const currentAd = ads[currentIndex];

  const handleClick = () => {
    openAdvertisementLink(currentAd.target_url);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex - 1 + ads.length) % ads.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % ads.length);
  };

  return (
    <div className="carousel-ad-container">
      <div 
        className="carousel-ad"
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        <img 
          src={currentAd.adv_url} 
          alt="advertisement"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            borderRadius: '8px',
            objectFit: 'cover',
          }}
        />
      </div>
      
      {ads.length > 1 && (
        <>
          <button 
            className="carousel-nav carousel-nav-prev"
            onClick={handlePrev}
            aria-label="Previous ad"
          >
            ‹
          </button>
          <button 
            className="carousel-nav carousel-nav-next"
            onClick={handleNext}
            aria-label="Next ad"
          >
            ›
          </button>
          
          <div className="carousel-dots">
            {ads.map((_, index) => (
              <div
                key={index}
                className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CarouselAdvertisement;
