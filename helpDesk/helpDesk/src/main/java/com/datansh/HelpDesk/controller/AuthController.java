package com.datansh.HelpDesk.controller;
import com.datansh.HelpDesk.dto.LoginRequest;
import com.datansh.HelpDesk.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
@RestController
public class AuthController {
    private  final AuthenticationManager authenticationManager;
    private  final JwtService jwtService;
    public AuthController(AuthenticationManager authenticationManager,JwtService jwtService){
        this.authenticationManager = authenticationManager;
        this.jwtService =jwtService;
    }
    @PostMapping("/login")
    public String login(@RequestBody @Valid LoginRequest loginRequest){
        UsernamePasswordAuthenticationToken authenticationToken =new UsernamePasswordAuthenticationToken(
                loginRequest.email(),
                loginRequest.password()
        );
        Authentication authentication =authenticationManager.authenticate(authenticationToken);


      return jwtService.generateToken(authentication) ;


    }
}
