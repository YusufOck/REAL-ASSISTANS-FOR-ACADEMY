import { useState } from "react"
import { Link, useNavigate } from "react-router-dom" // useNavigate eklendi
import { toast } from "sonner" // Bildirim paketi eklendi
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
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  // Sayfa değiştirmek için kullandığımız React Router kancası
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simüle edilmiş giriş isteği
    console.log("Login attempt:", email)
    
    // 1.5 saniye bekle (Sanki Backend'e soruyormuşuz gibi)
    setTimeout(() => {
      setIsLoading(false)

      // 1. ADIM: Ekrana havalı bir yeşil kutucuk çıkar
      toast.success("Giriş Başarılı!", {
        description: "ResearchOS paneline yönlendiriliyorsunuz...",
        duration: 2000, // 2 saniye ekranda kalsın
      })

      // 2. ADIM: Kullanıcıyı Dashboard sayfasına fırlat
      navigate("/dashboard")
    }, 1500)
  }

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      {/* SOL TARAF: Branding */}
      <div className="hidden bg-zinc-900 lg:flex flex-col justify-between p-10 text-white">
        <div className="flex items-center gap-2 font-bold text-2xl">
          <Atom className="h-8 w-8 text-blue-400" />
          <span>ResearchOS</span>
        </div>
        <div className="space-y-4">
          <blockquote className="space-y-2">
            <p className="text-lg font-medium leading-relaxed">
              &ldquo;Bilim, organize edilmiş bilgidir. Bilgelik ise organize edilmiş yaşamdır. 
              Bu platform, akademik veriyi bilgiye dönüştürmek için tasarlandı.&rdquo;
            </p>
            <footer className="text-sm text-zinc-400">Dr. Quantum AI</footer>
          </blockquote>
        </div>
        <div className="text-sm text-zinc-500">
          © 2025 Research Platform. All rights reserved.
        </div>
      </div>

      {/* SAĞ TARAF: Form */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <Card className="w-full max-w-md border-none shadow-none sm:border sm:shadow-lg">
          <CardHeader className="space-y-1 text-center sm:text-left">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Giriş Yap
            </CardTitle>
            <CardDescription>
              Devam etmek için kurumsal e-posta adresinizi girin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@university.edu" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="bg-zinc-50/50"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Şifre</Label>
                  <a href="#" className="text-sm text-blue-600 hover:underline font-medium">
                    Şifremi unuttum?
                  </a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Giriş Yapılıyor...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" /> Giriş Yap
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