import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { authService } from "@/services/authService"
import { api } from "@/lib/api" // Departmanları çekmek için
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Atom, UserPlus, Loader2, Mail, User, Building2 } from "lucide-react"

export default function Register() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [departments, setDepartments] = useState<{department_id: number, name: string}[]>([])
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department_id: ""
  })

  // Sayfa açıldığında departman listesini getir
  // Sayfa açıldığında departman listesini getir
  useEffect(() => {
  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/departments/')
      
      // 'map is not a function' hatasını engellemek için daha kısa ve sağlam bir kontrol:
      const rawData = response.data
      const list = Array.isArray(rawData) ? rawData : (rawData?.results || [])
      
      setDepartments(list)
    } catch (error) {
      console.error("Departmanlar yüklenemedi:", error)
      setDepartments([]) 
      toast.error("Bölüm listesi alınamadı.")
    }
  }
  fetchDepartments()
}, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validasyonlar
    if (!formData.full_name || !formData.email || !formData.password || !formData.department_id) {
        toast.warning("Lütfen tüm alanları doldurun.")
        return
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Şifreler birbirini tutmuyor!")
      return
    }

    setIsLoading(true)

    try {
      // ONBOARD endpoint'ine gönderim yapıyoruz
      await authService.onboard({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        department_id: parseInt(formData.department_id),
        role: "student" // Varsayılan rol
      })

      toast.success("Kayıt Başarılı!", {
        description: "Profiliniz ve hesabınız oluşturuldu. Giriş yapabilirsiniz.",
      })
      
      setTimeout(() => navigate("/login"), 1500)

    } catch (error: any) {
      console.error("Kayıt Hatası:", error)
      const errorMsg = error.response?.data?.detail || "Kayıt işlemi başarısız."
      toast.error("Hata Oluştu", { description: errorMsg })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      {/* SOL TARAFI (VİZYON ALANI) */}
      <div className="hidden bg-zinc-900 lg:flex flex-col justify-between p-10 text-white">
        <div className="flex items-center gap-2 font-bold text-2xl">
          <Atom className="h-8 w-8 text-blue-400" />
          <span>ResearchOS</span>
        </div>
        <div className="space-y-4">
          <p className="text-lg font-medium leading-relaxed italic text-zinc-300">
            &ldquo;Tek bir kayıtla tüm akademik dünyanı inşa et.&rdquo;
          </p>
        </div>
        <div className="text-sm text-zinc-500">© 2025 Research Platform.</div>
      </div>

      {/* SAĞ TARAF (KAYIT FORMU) */}
      <div className="flex items-center justify-center py-12 px-4 bg-background overflow-y-auto">
        <Card className="w-full max-w-md border-none shadow-none sm:border sm:shadow-lg">
          <CardHeader>
            <CardTitle>Araştırmacı Kaydı</CardTitle>
            <CardDescription>Bilgilerinizi girerek profilinizi oluşturun.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* AD SOYAD */}
              <div className="space-y-2">
                <Label htmlFor="full_name">Ad Soyad</Label>
                <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="full_name" placeholder="Yusuf Ocak" className="pl-9" required onChange={handleChange} />
                </div>
              </div>

              {/* E-POSTA */}
              <div className="space-y-2">
                <Label htmlFor="email">E-posta Adresi</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="email" type="email" placeholder="yusuf@gmail.com" className="pl-9" required onChange={handleChange} />
                </div>
              </div>

              {/* DEPARTMAN SEÇİMİ */}
              <div className="space-y-2">
                <Label htmlFor="department_id">Bölümünüz</Label>
                <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <select 
                        id="department_id" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={handleChange}
                        required
                    >
                        <option value="">Bölüm Seçiniz...</option>
                        {departments.map((dep) => (
                            <option key={dep.department_id} value={dep.department_id}>{dep.name}</option>
                        ))}
                    </select>
                </div>
              </div>

              {/* ŞİFRE */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Şifre</Label>
                    <Input id="password" type="password" placeholder="******" required onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
                    <Input id="confirmPassword" type="password" placeholder="******" required onChange={handleChange} />
                  </div>
              </div>

              <Button type="submit" className="w-full mt-4" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <UserPlus className="mr-2 h-4 w-4" />} 
                Hesap ve Profil Oluştur
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t p-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Zaten hesabınız var mı? <Link to="/login" className="text-blue-600 font-medium">Giriş Yap</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}