import { useState } from "react";
import { motion } from "framer-motion";
import { Key, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { updatePassword } from "firebase/auth";
import { auth } from "../../firebase";

export function CreatorChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Новые пароли не совпадают");
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, formData.newPassword);
        setSuccess(true);
        setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
        setError("Для безопасности нужно войти снова. Выйдите и войдите в аккаунт.");
      } else {
        setError("Не удалось сменить пароль. Попробуйте позже.");
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = formData.newPassword.length >= 8 ? "strong" :
                           formData.newPassword.length >= 6 ? "medium" :
                           formData.newPassword.length > 0 ? "weak" : "";

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-ugc-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Key className="w-8 h-8 text-ugc-primary" />
        </div>
        <h1 className="text-3xl font-display font-bold mb-2">Сменить пароль</h1>
        <p className="text-foreground/60">
          Выберите надежный пароль, который вы еще не использовали на других сайтах
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-white/10 rounded-2xl p-8"
      >
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Пароль успешно изменён!</h2>
            <p className="text-foreground/60 mb-6">
              Теперь вы можете войти с новым паролем
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors"
            >
              OK
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Текущий пароль
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  required
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  className="w-full h-12 bg-background border border-white/10 rounded-xl pl-4 pr-12 focus:outline-none focus:border-ugc-primary transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors"
                >
                  {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Новый пароль
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  required
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="w-full h-12 bg-background border border-white/10 rounded-xl pl-4 pr-12 focus:outline-none focus:border-ugc-primary transition-colors"
                  placeholder="Минимум 6 символов"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors"
                >
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength */}
              {formData.newPassword && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all ${
                        passwordStrength === "strong" ? "w-full bg-green-400" :
                        passwordStrength === "medium" ? "w-2/3 bg-yellow-400" :
                        passwordStrength === "weak" ? "w-1/3 bg-red-400" : ""
                      }`}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength === "strong" ? "text-green-400" :
                    passwordStrength === "medium" ? "text-yellow-400" :
                    passwordStrength === "weak" ? "text-red-400" : ""
                  }`}>
                    {passwordStrength === "strong" ? "Надёжный" :
                     passwordStrength === "medium" ? "Средний" :
                     passwordStrength === "weak" ? "Слабый" : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Подтвердите новый пароль
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full h-12 bg-background border border-white/10 rounded-xl pl-4 pr-12 focus:outline-none focus:border-ugc-primary transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors"
                >
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Match Indicator */}
              {formData.confirmPassword && (
                <div className="mt-2 flex items-center gap-2">
                  {formData.newPassword === formData.confirmPassword ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-green-400">Пароли совпадают</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-xs text-red-400">Пароли не совпадают</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
              className="w-full h-12 bg-ugc-primary hover:bg-ugc-primary/90 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Изменение..." : "Изменить пароль"}
            </button>
          </form>
        )}
      </motion.div>

      {/* Security Tips */}
      <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="font-medium mb-2 text-sm">💡 Советы по безопасности:</h3>
        <ul className="text-xs text-foreground/60 space-y-1">
          <li>• Используйте минимум 8 символов</li>
          <li>• Комбинируйте буквы, цифры и символы</li>
          <li>• Не используйте тот же пароль на других сайтах</li>
          <li>• Не сообщайте пароль никому</li>
        </ul>
      </div>
    </div>
  );
}
