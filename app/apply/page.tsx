import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Apply Now',
};

const eligibility = [
  '18 years or older',
  'U.S. Citizen or Permanent Resident',
  'High school diploma or GED',
  'Committed to 100% completion',
  'Willing to participate in job placement assistance',
  'Access to reliable internet & computer',
];

const programs = [
  'Digital Literacy Empowerment Class (6-7 Weeks)',
  'AI Professional Developer Certificate (IBM)',
  'Software & Applications Developer (IBM)',
  'CompTIA A+ Professional Certificate',
  'CompTIA Network+ Professional Certificate',
  'CompTIA Security+ Professional Certificate',
  'Cybersecurity Professional Certificate (Google)',
  'IT Automation with Python (Google)',
  'IT Support Professional Certificate (IBM)',
  'AWS Cloud Technology (Amazon)',
  'Data Analytics Professional Certificate (Google)',
  'Data Science Professional Certificate (IBM)',
  'Digital Marketing & E-Commerce (Google)',
  'Project Management Professional Certificate (Microsoft)',
  'UX Design Professional Certificate (Google)',
  'Medical Coding & Health Information Technician (MCHIT)',
  'Certified Production Technician (CPT)',
  'Certified Logistics Technician (CLT)',
  'Core Construction Skilled Trades Readiness',
  'Not sure — help me choose',
];

const supportOptions = [
  { value: 'math_reading', label: 'Basic Math / Reading Skills' },
  { value: 'ged', label: 'Getting my GED' },
  { value: 'financial', label: 'Budgeting & Financial Counseling' },
  { value: 'housing', label: 'Housing Assistance' },
  { value: 'tanf', label: 'Applying for TANF / Food Stamps or SSI' },
  { value: 'childcare', label: 'Child Care Services' },
  { value: 'mental_health', label: 'Mental Health Services' },
];

const referralSources = [
  'Google / Web Search',
  'Social Media (Facebook, Instagram, LinkedIn)',
  'Friend or Family',
  'Workforce Solutions',
  'Texas Workforce Commission (TWC)',
  'Community Organization',
  'Flyer or Brochure',
  'Other',
];

export default function ApplyPage() {
  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Start Your Career Today</h1>
          <p>Start with a WorkforceAP counselor to explore upcoming cohorts and career pathways.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            {['No experience required', 'Flexible learning options', 'We respond within 24 hours', 'Full job placement assistance'].map((t) => (
              <span key={t} style={{ background: 'rgba(255,255,255,.15)', padding: '.5rem 1rem', borderRadius: '50px', fontSize: '.9rem' }}>&#10003; {t}</span>
            ))}
          </div>
          <p style={{ marginTop: '1.5rem', fontSize: '.95rem', opacity: .9 }}>
            Questions? Call us: <a href="tel:5127771808" style={{ color: '#a47f38', fontWeight: 700 }}>(512) 777-1808</a>
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div style={{ background: '#a47f38', color: 'white', padding: '1rem 1.5rem', borderRadius: '8px', textAlign: 'center', marginBottom: '2.5rem', fontWeight: 600 }}>
            🔥 First Cohort Now Forming &mdash; Seats are limited. Apply today to hold your spot.
          </div>

          <div className="two-col">
            <div className="col">
              <h2>Who Can Apply?</h2>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
                {eligibility.map((item, i) => (
                  <li key={i} style={{ padding: '.75rem 0', borderBottom: i < eligibility.length - 1 ? '1px solid #f0f0f0' : 'none', display: 'flex', gap: '.75rem' }}>
                    <span style={{ color: '#4a9b4f', fontWeight: 700, fontSize: '1.1rem' }}>&#10003;</span> {item}
                  </li>
                ))}
              </ul>
              <div style={{ background: '#fff3f5', borderLeft: '4px solid #ad2c4d', padding: '1.25rem', borderRadius: '0 8px 8px 0', marginTop: '2rem' }}>
                <strong>What happens next</strong>
                <p style={{ color: '#555', fontSize: '.9rem', marginTop: '.5rem' }}>After you apply, a counselor will review your goals, walk through the best-fit program options, and help you prepare for the next available cohort.</p>
              </div>
            </div>

            <div className="col">
              <form className="apply-form" action="https://formspree.io/f/xpwzkyjo" method="POST">
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Reach Out to Get Started</h3>
                <p style={{ color: '#666', fontSize: '.9rem', marginBottom: '1.5rem' }}>Fill out the form below and a counselor will contact you within 24–48 hours to walk you through next steps.</p>

                <fieldset style={{ border: 'none', padding: 0, marginBottom: '1.5rem' }}>
                  <legend style={{ fontWeight: 700, fontSize: '.9rem', textTransform: 'uppercase', letterSpacing: '.05em', color: '#ad2c4d', marginBottom: '1rem' }}>Personal Information</legend>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group"><label>First Name *</label><input type="text" name="first_name" required /></div>
                    <div className="form-group"><label>Last Name *</label><input type="text" name="last_name" required /></div>
                  </div>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group"><label>Phone Number *</label><input type="tel" name="phone" required /></div>
                    <div className="form-group"><label>Email Address *</label><input type="email" name="email" required /></div>
                  </div>
                </fieldset>

                <fieldset style={{ border: 'none', padding: 0, marginBottom: '1.5rem' }}>
                  <legend style={{ fontWeight: 700, fontSize: '.9rem', textTransform: 'uppercase', letterSpacing: '.05em', color: '#ad2c4d', marginBottom: '1rem' }}>Location</legend>
                  <div className="form-group">
                    <label>Do you live in Travis County or Austin? *</label>
                    <div style={{ display: 'flex', gap: '2rem', marginTop: '.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 400 }}><input type="radio" name="travis_county" value="yes" required /> Yes</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 400 }}><input type="radio" name="travis_county" value="no" /> No</label>
                    </div>
                  </div>
                  <div className="form-group"><label>If no — what city, state, and county do you live in?</label><input type="text" name="location_other" /></div>
                </fieldset>

                <fieldset style={{ border: 'none', padding: 0, marginBottom: '1.5rem' }}>
                  <legend style={{ fontWeight: 700, fontSize: '.9rem', textTransform: 'uppercase', letterSpacing: '.05em', color: '#ad2c4d', marginBottom: '1rem' }}>Employment Status</legend>
                  <div className="form-group">
                    <label>Are you looking for training services to help with skills for a job? *</label>
                    <div style={{ display: 'flex', gap: '2rem', marginTop: '.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 400 }}><input type="radio" name="seeking_training" value="yes" required /> Yes</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 400 }}><input type="radio" name="seeking_training" value="no" /> No</label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Are you currently unemployed (terminated, laid off, or received notice of layoff)? *</label>
                    <div style={{ display: 'flex', gap: '2rem', marginTop: '.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 400 }}><input type="radio" name="unemployed" value="yes" required /> Yes</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 400 }}><input type="radio" name="unemployed" value="no" /> No</label>
                    </div>
                  </div>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group"><label>Current Occupation</label><input type="text" name="occupation" /></div>
                    <div className="form-group"><label>Years of Experience</label><input type="text" name="experience" /></div>
                  </div>
                  <div className="form-group"><label>Company Laid Off From (if applicable)</label><input type="text" name="laid_off_from" /></div>
                </fieldset>

                <fieldset style={{ border: 'none', padding: 0, marginBottom: '1.5rem' }}>
                  <legend style={{ fontWeight: 700, fontSize: '.9rem', textTransform: 'uppercase', letterSpacing: '.05em', color: '#ad2c4d', marginBottom: '1rem' }}>Income &amp; Benefits</legend>
                  <div className="form-group">
                    <label>Are you eligible for TANF or Food Stamps? *</label>
                    <div style={{ display: 'flex', gap: '2rem', marginTop: '.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 400 }}><input type="radio" name="tanf" value="yes" required /> Yes</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 400 }}><input type="radio" name="tanf" value="no" /> No</label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Are you single or married? *</label>
                    <div style={{ display: 'flex', gap: '2rem', marginTop: '.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 400 }}><input type="radio" name="marital" value="single" required /> Single</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 400 }}><input type="radio" name="marital" value="married" /> Married</label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>How many people in your household? *</label>
                    <select name="household_size" required>
                      <option value="">Select&hellip;</option>
                      <option value="1">1 — max $12,880/yr</option>
                      <option value="2">2 — max $17,420/yr</option>
                      <option value="3">3 — max $22,258/yr</option>
                      <option value="4">4 — max $27,479/yr</option>
                      <option value="5">5 — max $32,432/yr</option>
                      <option value="6">6 — max $37,931/yr</option>
                      <option value="7">7 — max $43,430/yr</option>
                      <option value="8">8 — max $48,929/yr</option>
                      <option value="9+">9+ — max $54,428/yr</option>
                    </select>
                  </div>
                  <div className="form-group"><label>What is your yearly household income? *</label><input type="text" name="income" placeholder="e.g. $35,000" required /></div>
                </fieldset>

                <fieldset style={{ border: 'none', padding: 0, marginBottom: '1.5rem' }}>
                  <legend style={{ fontWeight: 700, fontSize: '.9rem', textTransform: 'uppercase', letterSpacing: '.05em', color: '#ad2c4d', marginBottom: '1rem' }}>Program Interest</legend>
                  <div className="form-group">
                    <label>What class are you most interested in? *</label>
                    <select name="program" required>
                      <option value="">Select a program&hellip;</option>
                      {programs.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Best times to contact you by phone?</label><input type="text" name="best_time" placeholder="e.g. Weekday mornings" /></div>
                  <div className="form-group"><label>Best time for a tour?</label><input type="text" name="tour_time" /></div>
                  <div className="form-group">
                    <label>How did you hear about us?</label>
                    <select name="referral">
                      <option value="">Select&hellip;</option>
                      {referralSources.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </fieldset>

                <fieldset style={{ border: 'none', padding: 0, marginBottom: '1.5rem' }}>
                  <legend style={{ fontWeight: 700, fontSize: '.9rem', textTransform: 'uppercase', letterSpacing: '.05em', color: '#ad2c4d', marginBottom: '1rem' }}>Additional Support (Check all that apply)</legend>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                    {supportOptions.map((opt) => (
                      <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 400, fontSize: '.9rem' }}>
                        <input type="checkbox" name="support" value={opt.value} /> {opt.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="form-group"><label>Anything else you&rsquo;d like us to know?</label><textarea name="message" rows={4} /></div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.05rem' }}>Submit Application</button>
                <p style={{ textAlign: 'center', marginTop: '1rem', color: '#888', fontSize: '.85rem' }}>We review every application and respond within 24–48 hours. Your information is kept private.</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
