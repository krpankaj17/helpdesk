package com.datansh.HelpDesk.controller;

import com.datansh.HelpDesk.dto.CreateTicketCategoryRequest;
import com.datansh.HelpDesk.dto.TicketCategoryResponse;
import com.datansh.HelpDesk.service.TicketCategoryService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/category")
public class TicketCategoryController {
    private static final Logger log = LoggerFactory.getLogger(TicketCategoryController.class);
    private final TicketCategoryService service;

    public TicketCategoryController(TicketCategoryService service){
        this.service = service;
    }
    @GetMapping
    public ResponseEntity<Page<TicketCategoryResponse>> getAllCategories(
            @org.springdoc.core.annotations.ParameterObject
            @PageableDefault(size = 10, sort = "categoryId", direction = Sort.Direction.ASC) Pageable pageable){
        return ResponseEntity.status(HttpStatus.OK).body(service.getAllCategories(pageable));
    }
    @PostMapping
    public ResponseEntity<TicketCategoryResponse> createCategory(@RequestBody @Valid CreateTicketCategoryRequest request){
        log.info("REST request to create category: {}", request.name());
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createTicketCategory(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TicketCategoryResponse> updateCategory(
            @PathVariable Long id,
            @RequestBody @Valid com.datansh.HelpDesk.dto.UpdateTicketCategoryRequest request){
        log.info("REST request to update category: {}", id);
        return ResponseEntity.status(HttpStatus.OK).body(service.updateTicketCategory(request, id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id){
        log.info("REST request to delete category: {}", id);
        service.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
