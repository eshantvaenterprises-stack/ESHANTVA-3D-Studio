import { MessageCircle, Phone } from 'lucide-react';
import { contactConfig } from '@/config/contact';
import styles from './BusinessContactChannels.module.css';

/** Two compact, outbound-only chat launchers. No forms, cards, tracking or credentials. */
export function BusinessContactChannels() {
  return (
    <nav className={styles.launchers} aria-label="Chat with ESHANTVA 3D Studio">
      {contactConfig.whatsappPublicContactEnabled && (
        <a
          className={`${styles.bubble} ${styles.whatsapp}`}
          href={contactConfig.whatsappChatUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open ESHANTVA WhatsApp business chat in a new tab"
          title="WhatsApp chat"
        >
          <MessageCircle className={styles.whatsappBubble} size={25} strokeWidth={2.1} aria-hidden="true" />
          <Phone className={styles.phone} size={13} strokeWidth={2.6} aria-hidden="true" />
        </a>
      )}
      <a
        className={`${styles.bubble} ${styles.arattai}`}
        href={contactConfig.arattaiChatUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open ESHANTVA Arattai business chat in a new tab"
        title="Arattai chat"
      >
        <span className={styles.arattaiGlyph} aria-hidden="true">A</span>
      </a>
    </nav>
  );
}
