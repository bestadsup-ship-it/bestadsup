import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TagInput from '../components/TagInput';
import Toast from '../components/Toast';
import { servicesAPI } from '../api/client';
import '../styles/createService.css';

function CreateService() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ isVisible: false, type: '', message: '' });

  // Basic Info
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Pricing & Delivery
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [deliveryTimeDays, setDeliveryTimeDays] = useState('');
  const [revisionsIncluded, setRevisionsIncluded] = useState('');
  const [slotsAvailable, setSlotsAvailable] = useState('');

  // Service Details
  const [includes, setIncludes] = useState(['']);
  const [whatYouGet, setWhatYouGet] = useState(['']);
  const [idealFor, setIdealFor] = useState(['']);
  const [requirements, setRequirements] = useState('');
  const [tags, setTags] = useState([]);

  // Portfolio Items
  const [portfolioItems, setPortfolioItems] = useState([
    { title: '', description: '', imageUrl: '', results: '' }
  ]);

  // FAQs
  const [faqs, setFaqs] = useState([
    { question: '', answer: '' }
  ]);

  // Pricing Tiers (optional)
  const [usePricingTiers, setUsePricingTiers] = useState(false);
  const [pricingTiers, setPricingTiers] = useState([
    { name: '', price: '', description: '', deliverables: [''] }
  ]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await servicesAPI.getCategories();
      setCategories(data || []);
    } catch (err) {
      console.error('Error loading categories:', err);
      setCategories([]);
    }
  };

  const handleArrayInputChange = (setter, index, value) => {
    setter(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const addArrayField = (setter) => {
    setter(prev => [...prev, '']);
  };

  const removeArrayField = (setter, index) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handlePortfolioChange = (index, field, value) => {
    setPortfolioItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addPortfolioItem = () => {
    setPortfolioItems(prev => [
      ...prev,
      { title: '', description: '', imageUrl: '', results: '' }
    ]);
  };

  const removePortfolioItem = (index) => {
    setPortfolioItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleFaqChange = (index, field, value) => {
    setFaqs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addFaq = () => {
    setFaqs(prev => [...prev, { question: '', answer: '' }]);
  };

  const removeFaq = (index) => {
    setFaqs(prev => prev.filter((_, i) => i !== index));
  };

  const handleTierChange = (index, field, value) => {
    setPricingTiers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleTierDeliverableChange = (tierIndex, deliverableIndex, value) => {
    setPricingTiers(prev => {
      const updated = [...prev];
      updated[tierIndex].deliverables[deliverableIndex] = value;
      return updated;
    });
  };

  const addTier = () => {
    setPricingTiers(prev => [
      ...prev,
      { name: '', price: '', description: '', deliverables: [''] }
    ]);
  };

  const removeTier = (index) => {
    setPricingTiers(prev => prev.filter((_, i) => i !== index));
  };

  const addTierDeliverable = (tierIndex) => {
    setPricingTiers(prev => {
      const updated = [...prev];
      updated[tierIndex].deliverables.push('');
      return updated;
    });
  };

  const removeTierDeliverable = (tierIndex, deliverableIndex) => {
    setPricingTiers(prev => {
      const updated = [...prev];
      updated[tierIndex].deliverables = updated[tierIndex].deliverables.filter(
        (_, i) => i !== deliverableIndex
      );
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Filter out empty values from arrays
      const cleanIncludes = includes.filter(item => item.trim());
      const cleanWhatYouGet = whatYouGet.filter(item => item.trim());
      const cleanIdealFor = idealFor.filter(item => item.trim());

      // Filter portfolio items with at least a title
      const cleanPortfolio = portfolioItems.filter(item => item.title.trim());

      // Filter FAQs with both question and answer
      const cleanFaqs = faqs.filter(faq => faq.question.trim() && faq.answer.trim());

      // Build pricing tiers if enabled
      const cleanTiers = usePricingTiers
        ? pricingTiers
            .filter(tier => tier.name.trim() && tier.price)
            .map(tier => ({
              ...tier,
              price: parseFloat(tier.price),
              deliverables: tier.deliverables.filter(d => d.trim())
            }))
        : undefined;

      const serviceData = {
        name,
        tagline: tagline || undefined,
        description,
        category,
        imageUrl: imageUrl || undefined,
        price: parseFloat(price),
        currency,
        deliveryTimeDays: deliveryTimeDays ? parseInt(deliveryTimeDays) : undefined,
        revisionsIncluded: revisionsIncluded ? parseInt(revisionsIncluded) : undefined,
        includes: cleanIncludes.length > 0 ? cleanIncludes : undefined,
        whatYouGet: cleanWhatYouGet.length > 0 ? cleanWhatYouGet : undefined,
        idealFor: cleanIdealFor.length > 0 ? cleanIdealFor : undefined,
        requirements: requirements || undefined,
        tags: tags.length > 0 ? tags : undefined,
        portfolioItems: cleanPortfolio.length > 0 ? cleanPortfolio : undefined,
        faqs: cleanFaqs.length > 0 ? cleanFaqs : undefined,
        pricingTiers: cleanTiers,
        slotsAvailable: slotsAvailable ? parseInt(slotsAvailable) : undefined,
      };

      const result = await servicesAPI.create(serviceData);

      setToast({
        isVisible: true,
        type: 'success',
        message: 'Service created successfully!',
      });

      // Redirect to the new service page after a brief delay
      setTimeout(() => {
        navigate(`/services/${result.id}`);
      }, 1500);

    } catch (err) {
      console.error('Error creating service:', err);
      setError(err.response?.data?.message || 'Failed to create service. Please try again.');
      setToast({
        isVisible: true,
        type: 'error',
        message: err.response?.data?.message || 'Failed to create service',
      });
    } finally {
      setLoading(false);
    }
  };

  const closeToast = () => {
    setToast({ isVisible: false, type: '', message: '' });
  };

  return (
    <div className="page-container">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>Create Service Listing</h1>
          <p>Showcase your expertise and attract verified B2B clients</p>
        </div>

        <div className="create-service-container">
          <form onSubmit={handleSubmit} className="service-form">
            {error && <div className="error-message">{error}</div>}

            {/* Basic Information */}
            <section className="form-section">
              <h2>Basic Information</h2>

              <div className="form-group">
                <label>Service Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Google Ads Management for SaaS"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={255}
                  required
                />
              </div>

              <div className="form-group">
                <label>Tagline</label>
                <input
                  type="text"
                  placeholder="e.g., Profitable Google Ads campaigns in 30 days"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  maxLength={200}
                />
                <small>{tagline.length}/200 characters</small>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  placeholder="Describe your service in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Image URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Pricing & Delivery */}
            <section className="form-section">
              <h2>Pricing & Delivery</h2>

              <div className="form-row">
                <div className="form-group">
                  <label>Price *</label>
                  <input
                    type="number"
                    placeholder="999"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Delivery Time (days)</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={deliveryTimeDays}
                    onChange={(e) => setDeliveryTimeDays(e.target.value)}
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>Revisions Included</label>
                  <input
                    type="number"
                    placeholder="2"
                    value={revisionsIncluded}
                    onChange={(e) => setRevisionsIncluded(e.target.value)}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Available Slots</label>
                  <input
                    type="number"
                    placeholder="5"
                    value={slotsAvailable}
                    onChange={(e) => setSlotsAvailable(e.target.value)}
                    min="0"
                  />
                </div>
              </div>
            </section>

            {/* What's Included */}
            <section className="form-section">
              <h2>What's Included</h2>

              <div className="form-group">
                <label>What's Included in This Service</label>
                {includes.map((item, index) => (
                  <div key={index} className="array-input-row">
                    <input
                      type="text"
                      placeholder="e.g., Campaign setup & optimization"
                      value={item}
                      onChange={(e) => handleArrayInputChange(setIncludes, index, e.target.value)}
                    />
                    {includes.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => removeArrayField(setIncludes, index)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn-add" onClick={() => addArrayField(setIncludes)}>
                  + Add Item
                </button>
              </div>

              <div className="form-group">
                <label>What You'll Get</label>
                {whatYouGet.map((item, index) => (
                  <div key={index} className="array-input-row">
                    <input
                      type="text"
                      placeholder="e.g., Optimized ad campaigns"
                      value={item}
                      onChange={(e) => handleArrayInputChange(setWhatYouGet, index, e.target.value)}
                    />
                    {whatYouGet.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => removeArrayField(setWhatYouGet, index)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn-add" onClick={() => addArrayField(setWhatYouGet)}>
                  + Add Item
                </button>
              </div>

              <div className="form-group">
                <label>Ideal For</label>
                {idealFor.map((item, index) => (
                  <div key={index} className="array-input-row">
                    <input
                      type="text"
                      placeholder="e.g., B2B SaaS companies"
                      value={item}
                      onChange={(e) => handleArrayInputChange(setIdealFor, index, e.target.value)}
                    />
                    {idealFor.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => removeArrayField(setIdealFor, index)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn-add" onClick={() => addArrayField(setIdealFor)}>
                  + Add Item
                </button>
              </div>

              <div className="form-group">
                <label>Requirements from Buyer</label>
                <textarea
                  placeholder="What do you need from the buyer to get started?"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Tags</label>
                <TagInput
                  tags={tags}
                  onChange={setTags}
                  placeholder="Add tags (e.g., Google Ads, PPC, SaaS Marketing)"
                />
              </div>
            </section>

            {/* Portfolio */}
            <section className="form-section">
              <h2>Portfolio / Case Studies</h2>

              {portfolioItems.map((item, index) => (
                <div key={index} className="portfolio-item-group">
                  <div className="portfolio-header">
                    <h4>Case Study {index + 1}</h4>
                    {portfolioItems.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => removePortfolioItem(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      placeholder="e.g., Increased SaaS MRR by 150%"
                      value={item.title}
                      onChange={(e) => handlePortfolioChange(index, 'title', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      placeholder="Describe the project..."
                      value={item.description}
                      onChange={(e) => handlePortfolioChange(index, 'description', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <label>Image URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/case-study.jpg"
                      value={item.imageUrl}
                      onChange={(e) => handlePortfolioChange(index, 'imageUrl', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Results</label>
                    <input
                      type="text"
                      placeholder="e.g., 150% MRR increase in 3 months"
                      value={item.results}
                      onChange={(e) => handlePortfolioChange(index, 'results', e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <button type="button" className="btn-add" onClick={addPortfolioItem}>
                + Add Case Study
              </button>
            </section>

            {/* FAQs */}
            <section className="form-section">
              <h2>Frequently Asked Questions</h2>

              {faqs.map((faq, index) => (
                <div key={index} className="faq-group">
                  <div className="faq-header">
                    <h4>FAQ {index + 1}</h4>
                    {faqs.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => removeFaq(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Question</label>
                    <input
                      type="text"
                      placeholder="e.g., How long does it take?"
                      value={faq.question}
                      onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Answer</label>
                    <textarea
                      placeholder="Answer the question..."
                      value={faq.answer}
                      onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              ))}

              <button type="button" className="btn-add" onClick={addFaq}>
                + Add FAQ
              </button>
            </section>

            {/* Pricing Tiers (Optional) */}
            <section className="form-section">
              <div className="section-header-with-toggle">
                <h2>Pricing Tiers (Optional)</h2>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={usePricingTiers}
                    onChange={(e) => setUsePricingTiers(e.target.checked)}
                  />
                  <span>Offer multiple pricing tiers</span>
                </label>
              </div>

              {usePricingTiers && (
                <>
                  {pricingTiers.map((tier, tierIndex) => (
                    <div key={tierIndex} className="tier-group">
                      <div className="tier-header">
                        <h4>Tier {tierIndex + 1}</h4>
                        {pricingTiers.length > 1 && (
                          <button
                            type="button"
                            className="btn-remove"
                            onClick={() => removeTier(tierIndex)}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Tier Name</label>
                          <input
                            type="text"
                            placeholder="e.g., Basic"
                            value={tier.name}
                            onChange={(e) => handleTierChange(tierIndex, 'name', e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label>Price</label>
                          <input
                            type="number"
                            placeholder="499"
                            value={tier.price}
                            onChange={(e) => handleTierChange(tierIndex, 'price', e.target.value)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Description</label>
                        <textarea
                          placeholder="What's included in this tier?"
                          value={tier.description}
                          onChange={(e) => handleTierChange(tierIndex, 'description', e.target.value)}
                          rows={2}
                        />
                      </div>

                      <div className="form-group">
                        <label>Deliverables</label>
                        {tier.deliverables.map((deliverable, deliverableIndex) => (
                          <div key={deliverableIndex} className="array-input-row">
                            <input
                              type="text"
                              placeholder="e.g., Campaign setup"
                              value={deliverable}
                              onChange={(e) =>
                                handleTierDeliverableChange(tierIndex, deliverableIndex, e.target.value)
                              }
                            />
                            {tier.deliverables.length > 1 && (
                              <button
                                type="button"
                                className="btn-remove"
                                onClick={() => removeTierDeliverable(tierIndex, deliverableIndex)}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          className="btn-add-small"
                          onClick={() => addTierDeliverable(tierIndex)}
                        >
                          + Add Deliverable
                        </button>
                      </div>
                    </div>
                  ))}

                  <button type="button" className="btn-add" onClick={addTier}>
                    + Add Pricing Tier
                  </button>
                </>
              )}
            </section>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => navigate('/shop')}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Service'}
              </button>
            </div>
          </form>

          <aside className="service-tips">
            <div className="tips-card">
              <h3>Tips for a Great Service Listing</h3>
              <ul>
                <li><strong>Clear value proposition:</strong> Make your tagline compelling</li>
                <li><strong>Detailed description:</strong> Explain exactly what you do</li>
                <li><strong>Portfolio matters:</strong> Show real results with case studies</li>
                <li><strong>Be specific:</strong> Define who your ideal client is</li>
                <li><strong>Answer FAQs:</strong> Address common buyer questions</li>
                <li><strong>Professional images:</strong> Use high-quality visuals</li>
              </ul>
            </div>

            <div className="tips-card">
              <h3>Verification Benefits</h3>
              <ul>
                <li>Verified creators rank higher in search</li>
                <li>Showcase proven metrics & results</li>
                <li>Build trust with verification badges</li>
                <li>Attract higher-quality clients</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={closeToast}
      />
    </div>
  );
}

export default CreateService;
