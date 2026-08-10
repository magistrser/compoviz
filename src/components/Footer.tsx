import { Github, MessageSquare } from "lucide-react";
import "./Footer.scss";

export default function Footer() {
    return (
        <footer className="app-footer">
            <div className="footer-content">
                <div className="footer-message">
                    <span className="footer-emoji">⭐</span>
                    <p>Love our app? Star us on GitHub and create issues for your valuable feedback!</p>
                </div>
                <div className="footer-actions">
                    <a
                        href="https://github.com/magistrser/compoviz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-btn footer-btn-primary"
                        title="Star on GitHub"
                    >
                        <Github size={16} />
                        <span>Star on GitHub</span>
                        <img
                            src="https://img.shields.io/github/stars/magistrser/compoviz?style=social"
                            alt="GitHub stars"
                            className="github-badge"
                        />
                    </a>
                    <a
                        href="https://github.com/magistrser/compoviz/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-btn footer-btn-secondary"
                        title="Report an issue or request a feature"
                    >
                        <MessageSquare size={16} />
                        <span>Report Issue</span>
                    </a>
                </div>
            </div>
        </footer>
    );
}
