package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.LoginRequest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {
    private  final AuthenticationManager authenticationManager;
    public AuthController(AuthenticationManager authenticationManager){
        this.authenticationManager = authenticationManager;
    }
    @PostMapping("/login")
    public Authentication login(@RequestBody LoginRequest loginRequest){
        UsernamePasswordAuthenticationToken authenticationToken =new UsernamePasswordAuthenticationToken(
                loginRequest.email(),
                loginRequest.password()
        );
      return   authenticationManager.authenticate(authenticationToken);
                

    }
}
