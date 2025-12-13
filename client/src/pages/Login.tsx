import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner" 
import { authService } from "@/services/authService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Atom, Lock, Loader2 } from "lucide-react"

export default function Login() {
  const [username, setUsername] = useState("") 
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 1. Backend'e Giriş İsteği
      const response = await authService.login({ username, password })

      // 2. Tokenları Kaydet
      localStorage.setItem("accessToken", response.access)
      localStorage.setItem("refreshToken", response.refresh)

      toast.success("Giriş Başarılı!", {
        description: "Panele yönlendiriliyorsunuz...",
        duration: 2000,
      })
      
      // 3. Yönlendir
      setTimeout(() => {
        navigate("/dashboard")
      }, 1000)

    } catch (error: any) {
      console.error("Login Hatası:", error)
      
      // Hata Mesajını Belirle
      let description = "Bir hata oluştu."
      
      if (error.response?.status === 401) {
        description = "Kullanıcı adı veya şifre hatalı. Lütfen kontrol edin."
      } else if (error.code === "ERR_NETWORK") {
        description = "Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin."
      } else if (error.response?.status === 500) {
        description = "Sunucu hatası. Lütfen daha sonra tekrar deneyin."
      }

      // Kırmızı Hatayı Göster
      toast.error("Giriş Başarısız", {
        description: description,
        duration: 4000,
      })
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
              &ldquo;Bilimsel veriyi bilgiye, bilgiyi geleceğe dönüştürün.&rdquo;
            </p>
          </blockquote>
        </div>
        <div className="text-sm text-zinc-500">© 2025 Research Platform.</div>
      </div>

      {/* SAĞ TARAF (Giriş Formu) */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <Card className="w-full max-w-md border-none shadow-none sm:border sm:shadow-lg">
          <CardHeader>
            <CardTitle>Giriş Yap</CardTitle>
            <CardDescription>Kurumsal hesabınızla devam edin</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı</Label>
                <Input 
                  id="username" 
                  type="text" 
                  placeholder="Kullanıcı adınız"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required 
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" /> 
                    Giriş Yap
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t p-6 mt-4">
            <p className="text-sm text-muted-foreground">
              Hesabınız yok mu?{" "}
              <Link to="/register" className="text-blue-600 hover:underline font-medium">
                Kayıt Ol
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}