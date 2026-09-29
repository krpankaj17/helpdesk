package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.CreateTicketRequest;
import com.datansh.HelpDesk.dto.TicketResponse;
import com.datansh.HelpDesk.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ticket")
public class TicketController {
    private final TicketService ticketService;
    public TicketController(TicketService ticketService){
        this.ticketService = ticketService;
    }

    @GetMapping
    public ResponseEntity<Page<TicketResponse>> getAllTickets(Pageable pageable){
         return ResponseEntity.ok().body(ticketService.getAllTickets(pageable));
    }
    @PostMapping
    public ResponseEntity<TicketResponse> createTicket(@RequestBody @Valid CreateTicketRequest request){
        return ResponseEntity.ok().body(ticketService.createTicket(request));
    }
}
