import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { authService } from "@/services/authService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Atom, UserPlus, Loader2, Mail, User, Lock } from "lucide-react"

export default function Register() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  
  // Tüm form verilerini tutan state
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  })

  // Input değiştikçe state'i günceller
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 1. Validasyonlar
    if (!formData.username || !formData.email || !formData.password) {
        toast.warning("Lütfen tüm alanları doldurun.")
        return
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Şifreler birbirini tutmuyor!")
      return
    }
    if (formData.password.length < 6) {
      toast.warning("Şifreniz çok kısa (en az 6 karakter).")
      return
    }

    setIsLoading(true)

    try {
      // 2. Backend'e Gönderim
      await authService.register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      })

      // 3. Başarılı Sonuç
      toast.success("Kayıt Başarılı!", {
        description: "Hesabınız oluşturuldu. Giriş sayfasına yönlendiriliyorsunuz.",
      })
      
      // 1.5 saniye sonra Login'e at
      setTimeout(() => navigate("/login"), 1500)

    } catch (error: any) {
      console.error("Kayıt Hatası:", error)
      
      // Hata mesajını yakala (Örn: Kullanıcı adı doluysa)
      let errorMsg = "Kayıt işlemi başarısız."
      if (error.response?.data?.username) {
        errorMsg = "Bu kullanıcı adı zaten kullanılıyor."
      } else if (error.response?.data?.email) {
          errorMsg = "Bu e-posta adresi zaten kayıtlı."
      }

      toast.error("Hata Oluştu", { description: errorMsg })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      {/* SOL TARAFI (Marka Alanı) */}
      <div className="hidden bg-zinc-900 lg:flex flex-col justify-between p-10 text-white">
        <div className="flex items-center gap-2 font-bold text-2xl">
          <Atom className="h-8 w-8 text-blue-400" />
          <span>ResearchOS</span>
        </div>
        <div className="space-y-4">
          <blockquote className="space-y-2">
            <p className="text-lg font-medium leading-relaxed">
              &ldquo;Bilimin sınırlarını zorlayanlar için tasarlandı.&rdquo;
            </p>
          </blockquote>
        </div>
        <div className="text-sm text-zinc-500">© 2025 Research Platform.</div>
      </div>

      {/* SAĞ TARAF (Kayıt Formu) */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <Card className="w-full max-w-md border-none shadow-none sm:border sm:shadow-lg">
          <CardHeader>
            <CardTitle>Aramıza Katılın</CardTitle>
            <CardDescription>Araştırma dünyasına ilk adımınızı atın.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* KULLANICI ADI ALANI */}
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı</Label>
                <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                        id="username" 
                        placeholder="kullaniciadi" 
                        className="pl-9"
                        required 
                        onChange={handleChange} 
                    />
                </div>
              </div>

              {/* E-POSTA ALANI */}
              <div className="space-y-2">
                <Label htmlFor="email">E-posta Adresi</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                        id="email" 
                        type="email" 
                        placeholder="ornek@mail.com" 
                        className="pl-9"
                        required 
                        onChange={handleChange} 
                    />
                </div>
              </div>

              {/* ŞİFRE ALANI */}
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                        id="password" 
                        type="password" 
                        placeholder="******"
                        className="pl-9"
                        required 
                        onChange={handleChange} 
                    />
                </div>
              </div>

              {/* ŞİFRE TEKRAR ALANI */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                        id="confirmPassword" 
                        type="password" 
                        placeholder="******"
                        className="pl-9"
                        required 
                        onChange={handleChange} 
                    />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <UserPlus className="mr-2 h-4 w-4" />} 
                Hesap Oluştur
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t p-6 mt-4">
            <p className="text-sm text-muted-foreground">
              Zaten hesabınız var mı?{" "}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Giriş Yap
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}