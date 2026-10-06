$passwords = @('password', '12345678', 'admin123', 'Password@123', 'Pankaj@123', 'pankaj', 'admin', 'root', 'Pankaj123', 'pankaj123', 'Helpdesk@123')
foreach ($p in $passwords) {
    $body = @{ email = 'pankajsingh@gmail.com'; password = $p } | ConvertTo-Json
    try {
        $res = Invoke-RestMethod -Uri "http://localhost:8080/login" -Method Post -Body $body -ContentType "application/json"
        Write-Host "SUCCESS! Password is: $p"
        Write-Host ($res | ConvertTo-Json)
        break
    } catch {
        Write-Host "$p -> Failed ($($_.Exception.Message))"
    }
}
