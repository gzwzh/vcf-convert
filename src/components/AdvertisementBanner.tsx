import React, { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getAdvertisement, openAdvertisementLink, Advertisement } from '../utils/adService';
import './AdvertisementBanner.css';

interface AdvertisementBannerProps {
  variant?: 'header' | 'sidebar';
}

const AdvertisementBanner: React.FC<AdvertisementBannerProps> = ({ variant = 'header' }) => {
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAd = async () => {
      setLoading(true);
      const advertisement = await getAdvertisement();
      setAd(advertisement);
      setLoading(false);
    };

    fetchAd();
    // 每5分钟刷新一次广告
    const interval = setInterval(fetchAd, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`ad-banner ad-banner-${variant} ad-loading`}>
        <Spin size="small" />
      </div>
    );
  }

  if (!ad) {
    return null;
  }

  const handleClick = () => {
    openAdvertisementLink(ad.target_url);
  };

  return (
    <div 
      className={`ad-banner ad-banner-${variant}`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <img 
        src={ad.adv_url} 
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
  );
};

export default AdvertisementBanner;
