"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'linear-gradient(90deg, #1d4ed8 100%)',
        color: '#fff',
        boxShadow: '0 1px 0 rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.12)'
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '16px 12px' }}>
        <div className="navbar-container">
          <div className="navbar-brand">
            <Link href="/" className="brand" style={{ fontSize: 24, textDecoration: 'none', color: '#fff' }}>
              VidSaverPro
            </Link>
          </div>
          
          <div className="navbar-right">
            {/* Theme Toggle */}
            <div className="navbar-theme" style={{ filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))' }}>
              <ThemeToggle />
            </div>

            {/* Mobile Hamburger Button */}
            <button 
              className="navbar-hamburger"
              onClick={toggleMenu}
              aria-label="Toggle navigation menu"
            >
              <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
              <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
              <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
            </button>

            {/* Desktop Navigation */}
            <nav className="navbar-desktop">
              <Link href="/" style={{ color: '#fff', textDecoration: 'none', opacity: 0.95 }}>YouTube</Link>
              <Link href="/reels" style={{ color: '#fff', textDecoration: 'none', opacity: 0.95 }}>Reels</Link>
              <Link href="/facebook" style={{ color: '#fff', textDecoration: 'none', opacity: 0.95 }}>Facebook</Link>
            </nav>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <nav className={`navbar-mobile ${isMenuOpen ? 'open' : ''}`}>
          <Link href="/" onClick={closeMenu} style={{ color: '#fff', textDecoration: 'none', opacity: 0.95 }}>
            YouTube
          </Link>
          <Link href="/reels" onClick={closeMenu} style={{ color: '#fff', textDecoration: 'none', opacity: 0.95 }}>
            Reels
          </Link>
          <Link href="/facebook" onClick={closeMenu} style={{ color: '#fff', textDecoration: 'none', opacity: 0.95 }}>
            Facebook
          </Link>
        </nav>
      </div>
    </header>
  );
}
