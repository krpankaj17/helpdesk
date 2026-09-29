package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.CreateTicketCategoryRequest;
import com.datansh.HelpDesk.dto.TicketCategoryResponse;
import com.datansh.HelpDesk.service.TicketCategoryService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/category")
public class TicketCategoryController {
    private final TicketCategoryService service;
    public TicketCategoryController(TicketCategoryService service){
        this.service = service;
    }
    @GetMapping
    public ResponseEntity<Page<TicketCategoryResponse>> getAllCategories(Pageable pageable){
        return ResponseEntity.status(HttpStatus.OK).body(service.getAllCategories(pageable));
    }
    @PostMapping
    public ResponseEntity<TicketCategoryResponse> createCategory(@RequestBody @Valid CreateTicketCategoryRequest request){
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createTicketCategory(request));
    }
}
