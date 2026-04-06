import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-card border-t border-white/10 py-8 mt-auto">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          {/* Left side - Logo and description */}
          <div className="flex-1">
            <Link href="/" className="text-2xl font-display font-bold text-white mb-2 inline-block">
              ADROP
            </Link>
            <p className="text-foreground/60 max-w-xl text-sm sm:text-base mb-2">
              Платформа номер один для запуска UGC-кампаний, нативных интеграций и работы с креаторами по всему миру.
            </p>
            <div className="text-xs text-foreground/40">
              © {new Date().getFullYear()} ADROP. Все права защищены.
            </div>
          </div>

          {/* Right side - Links */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 lg:gap-12">
            <div>
              <h3 className="font-bold text-white mb-3 text-sm">Платформа</h3>
              <ul className="space-y-2">
                <li><Link href="/auth?mode=login" className="text-foreground/60 hover:text-white transition-colors text-sm">Войти</Link></li>
                <li><Link href="/auth?mode=register" className="text-foreground/60 hover:text-white transition-colors text-sm">Регистрация</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-white mb-3 text-sm">Компания</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-foreground/60 hover:text-white transition-colors text-sm">О нас</Link></li>
                <li><Link href="/privacy" className="text-foreground/60 hover:text-white transition-colors text-sm">Политика конфиденциальности</Link></li>
                <li><a href="mailto:support@adrop.com" className="text-foreground/60 hover:text-white transition-colors text-sm">Поддержка</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
