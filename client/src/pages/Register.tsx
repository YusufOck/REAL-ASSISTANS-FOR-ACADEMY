import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
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
import { Atom, UserPlus, Loader2 } from "lucide-react"

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      
      // ✨ SİHİRLİ DOKUNUŞ: Bilgileri tarayıcıya kaydet
      // Gerçek projede bu veriler Backend'e (Django) gönderilir.
      localStorage.setItem("userEmail", email)
      localStorage.setItem("userPassword", password)
      
      toast.success("Hesap oluşturuldu! 🎉", {
        description: "Giriş yapmak için yönlendiriliyorsunuz.",
      })

      navigate("/login")
    }, 1500)
  }

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      <div className="hidden bg-zinc-900 lg:flex flex-col justify-between p-10 text-white">
        <div className="flex items-center gap-2 font-bold text-2xl">
          <Atom className="h-8 w-8 text-blue-400" />
          <span>ResearchOS</span>
        </div>
        <div className="space-y-4">
           <blockquote className="space-y-2">
            <p className="text-lg font-medium leading-relaxed">
              &ldquo;Bilgi paylaştıkça çoğalır.&rdquo;
            </p>
          </blockquote>
        </div>
        <div className="text-sm text-zinc-500">© 2025 Research Platform.</div>
      </div>

      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <Card className="w-full max-w-md border-none shadow-none sm:border sm:shadow-lg">
          <CardHeader>
            <CardTitle>Hesap Oluştur</CardTitle>
            <CardDescription>Kayıt olmak için bilgilerinizi girin</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input 
                  id="password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Kayıt Ol
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