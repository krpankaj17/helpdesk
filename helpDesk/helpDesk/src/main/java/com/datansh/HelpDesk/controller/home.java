package com.datansh.HelpDesk.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class home {
    @GetMapping("/")
    public static String greet(){
        return "Hello world";
    }
}
