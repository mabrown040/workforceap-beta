'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import './leadership.css';

const leaders = [
  {
    id: 'michael',
    name: 'Michael A. Brown, PMP, ChE',
    role: 'Executive Director, CEO',
    title: 'Executive Director & Chief Executive Officer',
    image: '/images/michael-brown.jpg',
    bio: "Michael A. Brown, PMP, ChE, is a highly accomplished business executive with a distinguished career spanning several decades in business development, project management, and education. He holds a Chemical Engineering degree from Texas A&M University. As former owner of Consulting Solutions.Net and key leader at State of Texas Career Schools, Goodwill Central Texas, and the Austin Urban League, he has consistently driven organizational excellence across public and private sectors. A devoted community leader, Michael is an active member of 100 Black Men of Austin and Alpha Phi Alpha Fraternity.",
    tags: ['PMP Certified', 'Chemical Engineering — Texas A&M University', '25+ Years Workforce Development', 'Goodwill Career & Technical Academy', 'Austin Urban League', '100 Black Men of Austin'],
  },
  {
    id: 'adriane',
    name: 'Adriane Brown',
    role: 'Chief Operating Officer',
    title: 'Chief Operating Officer',
    image: '/images/adriane-brown.jpg',
    bio: "Adriane Brown is a strategic business and operations leader with over 25 years of experience driving organizational growth and operational excellence. A Texas A&M graduate, she has led enterprise operations to national reach and brings deep expertise in business development, compliance, and performance optimization. She completed Microsoft Project Management Certification in 2025 and serves as Women's Ministry Leader at Celebration Church.",
    tags: ['Texas A&M University', 'Microsoft PM Certified (2025)', '25+ Years Operations', 'Business Development'],
  },
  {
    id: 'lakecia',
    name: 'Lakecia Gunter',
    role: 'Board Member',
    title: 'Board Member',
    image: '/images/lakecia-gunter.jpg',
    bio: 'Lakecia Gunter is a 25-year tech industry veteran serving as Chief Technology Officer, Global Partner Solutions at Microsoft. Honored as a Finalist in SUCCESS Magazine\'s 2023 Women of Influence, she is a nationally recognized engineer, speaker, and advocate for women in technology. She holds an MS in Electrical Engineering from Georgia Tech and currently serves on the Board of Directors at IDEX Corporation.',
    tags: ['Microsoft CTO, Global Partner Solutions', 'MS Electrical Engineering, Georgia Tech', 'SUCCESS 2023 Women of Influence', 'IDEX Corporation Board'],
  },
  {
    id: 'brandon',
    name: 'Brandon Frye',
    role: 'Board Member',
    title: 'Board Member',
    image: '/images/brandon-frye.jpg',
    bio: 'Brandon Frye is a seasoned entrepreneur and business operator with extensive experience founding, investing in, and leading high-growth companies. He co-founded Interstate Connections (named "Fastest Growing Private Company" by Austin Business Journal) and currently serves as CFO of The Business Bible. Brandon is deeply involved in community leadership, serving on multiple boards including Texas Alliance for Life.',
    tags: ['Co-Founder, Interstate Connections', 'CFO, The Business Bible', 'Austin Business Journal Honoree', 'Texas Alliance for Life Board'],
  },
  {
    id: 'derrick',
    name: 'Col. Derrick Fishback',
    role: 'Board Member (Ret.)',
    title: 'Board Member',
    image: '/images/derrick-fishback.jpg',
    bio: 'Colonel Derrick Fishback (Retired) is a transformational leader with nearly three decades of U.S. Army service complemented by leadership roles at Fortune 500 companies. He has commanded 1,800+ personnel and led cloud transformation initiatives at Amazon Web Services, IBM, and Dell. Derrick holds two master\'s degrees and serves as Board President of the Jazz Society of Pensacola.',
    tags: ['U.S. Army Colonel (Ret.) — 28 Years', 'AWS Cloud Transformation', 'IBM & Dell Leadership', "Two Master's Degrees"],
  },
];

export default function LeadershipContent() {
  const [activeLeader, setActiveLeader] = useState('michael');
  const bioRef = useRef<HTMLDivElement>(null);

  const handleClick = (id: string) => {
    setActiveLeader(id);
    setTimeout(() => bioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  };

  const active = leaders.find((l) => l.id === activeLeader)!;

  return (
    <section className="content-section">
      <div className="container">
        <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }} className="animate-on-scroll">Our Team</h2>
        <p style={{ textAlign: 'center', color: 'var(--color-gray-500)', marginBottom: '2.5rem', fontSize: '1rem' }} className="animate-on-scroll">Click a team member to learn more.</p>

        <div className="leaders-photo-grid animate-on-scroll">
          {leaders.map((leader) => (
            <div
              key={leader.id}
              className={`leader-photo-card${activeLeader === leader.id ? ' active' : ''}`}
              onClick={() => handleClick(leader.id)}
            >
              <div className="photo-wrap">
                <Image src={leader.image} alt={leader.name} width={190} height={190} loading="lazy" />
              </div>
              <div className="photo-info">
                <div className="photo-name">{leader.name}</div>
                <div className="photo-role">{leader.role}</div>
              </div>
            </div>
          ))}
        </div>

        <div ref={bioRef} className="bio-panel active">
          <div className="bio-photo">
            <Image src={active.image} alt={active.name} width={140} height={140} />
          </div>
          <div className="bio-content">
            <h2>{active.name}</h2>
            <span className="bio-title">{active.title}</span>
            <p className="bio-text">{active.bio}</p>
            <div className="bio-credentials">
              {active.tags.map((tag) => (
                <span key={tag} className="bio-tag">{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="join-cta animate-on-scroll">
          <h2>Join Our Mission</h2>
          <p>Interested in partnering with us, volunteering your expertise, or joining the board? We&apos;d love to hear from you.</p>
          <Link href="/contact" className="btn btn-primary btn-large">Get In Touch</Link>
        </div>
      </div>
    </section>
  );
}
