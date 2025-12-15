' Better WSL - Silent Launcher
' Double-click this file to start Better WSL silently

Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get script directory
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Function to check if a port is in use
Function IsPortInUse(port)
    On Error Resume Next
    Set objExec = WshShell.Exec("netstat -an")
    strOutput = objExec.StdOut.ReadAll
    IsPortInUse = InStr(strOutput, ":" & port & " ") > 0
    On Error Goto 0
End Function

' Check if services are already running
Dim backendRunning, frontendRunning, statusMsg
backendRunning = IsPortInUse("3000")
frontendRunning = IsPortInUse("5173")

If backendRunning And frontendRunning Then
    ' Both already running - just open browser
    statusMsg = "Better WSL is already running!" & vbCrLf & vbCrLf & "Opening browser..."
    MsgBox statusMsg, vbInformation, "Better WSL"
    WshShell.Run "http://localhost:5173", 1, False
    WScript.Quit
End If

' Show starting message
If backendRunning Then
    statusMsg = "Backend already running. Starting frontend..."
ElseIf frontendRunning Then
    statusMsg = "Frontend already running. Starting backend..."
Else
    statusMsg = "Starting Better WSL..." & vbCrLf & vbCrLf & "Please wait 5 seconds..."
End If
MsgBox statusMsg, vbInformation, "Better WSL"

' Start backend server if not running (hidden)
If Not backendRunning Then
    WshShell.Run "cmd /c cd /d """ & strScriptPath & "\server"" && node index.js", 0, False
    WScript.Sleep 2000
End If

' Start frontend client if not running (hidden)
If Not frontendRunning Then
    WshShell.Run "cmd /c cd /d """ & strScriptPath & "\client"" && npm run dev -- --host", 0, False
    WScript.Sleep 5000
End If

' Open browser
WshShell.Run "http://localhost:5173", 1, False

' Show success message
MsgBox "Better WSL is now running!" & vbCrLf & vbCrLf & _
       "Frontend: http://localhost:5173" & vbCrLf & _
       "Backend:  http://localhost:3000" & vbCrLf & vbCrLf & _
       "To stop: Run stop.bat", _
       vbInformation, "Better WSL Started"

' Cleanup
Set WshShell = Nothing
Set objFSO = Nothing
