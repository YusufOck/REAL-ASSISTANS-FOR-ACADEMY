import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, Activity, BookOpen, Users } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

export default function Dashboard() {
  const navigate = useNavigate()

  const handleLogout = () => {
    toast.info("Çıkış yapıldı 👋")
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      {/* Üst Bar */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Hoşgeldin, Araştırmacı! 🚀</h1>
          <p className="text-zinc-500">Bugün bilim için ne yapacaksın?</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Çıkış Yap
        </Button>
      </header>

      {/* İstatistik Kartları */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Proje</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif İşbirlikleri</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sistem Durumu</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Aktif</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}