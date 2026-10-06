package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.CreatePriorityRequest;
import com.datansh.HelpDesk.dto.PriorityResponse;
import com.datansh.HelpDesk.dto.UpdatePriorityRequest;
import com.datansh.HelpDesk.entity.Priority;
import com.datansh.HelpDesk.exception.ResourceNotFoundException;
import com.datansh.HelpDesk.repository.PriorityRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class PriorityService {
    private static final Logger log = LoggerFactory.getLogger(PriorityService.class);
    private final PriorityRepository repository;

    public PriorityService(PriorityRepository repository){
        this.repository = repository;
    }
    public Page<PriorityResponse> getAllPriority(Pageable pageable){
       return repository.findAll(pageable).map(this::mapToResponse);
    }
    public PriorityResponse createPriority(CreatePriorityRequest request) {
        Priority priority = Priority.builder()
                .name(request.name())
                .description(request.description()).build();
        Priority savedPriority = repository.save(priority);
        log.info("Priority created: " + savedPriority.getName() + " with id: " + savedPriority.getPriorityId());
        return mapToResponse(savedPriority);
    }
    public PriorityResponse updatePriority(UpdatePriorityRequest request,Long id){
       Priority priority = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Priority", "id", id));
       if(request.name()!= null){
           priority.setName(request.name());
       }
       if (request.description()!=null){
           priority.setDescription(request.description());
       }
      Priority savedPriority =  repository.save(priority);
      log.info("Priority updated: " + savedPriority.getName() + " with id: " + id);
      return mapToResponse(savedPriority);
    }

    public PriorityResponse getPriorityById(Long id) {
        Priority priority = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Priority", "id", id));
        return mapToResponse(priority);
    }

    public void deletePriority(Long id) {
        Priority priority = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Priority", "id", id));
        repository.delete(priority);
        log.info("Priority deleted with id: " + id);
    }

    public PriorityResponse mapToResponse(Priority priority){
        return new PriorityResponse(priority.getPriorityId(), priority.getName(), priority.getDescription());
    }

}
